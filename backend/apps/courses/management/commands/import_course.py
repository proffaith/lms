"""
Import a course from a proffaith JSON export file.

Usage:
    python manage.py import_course path/to/export.json --instructor <username>
"""

import json

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.accounts.models import User
from apps.assessments.models import (
    AnswerChoice,
    Assignment,
    Question,
    Quiz,
)
from apps.courses.models import Course, Lesson, LessonContent, Module
from apps.curriculum.models import CourseObjective


class Command(BaseCommand):
    help = 'Import a course from a proffaith LMS export JSON file'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to the JSON export file')
        parser.add_argument(
            '--instructor',
            type=str,
            required=True,
            help='Username of the instructor to assign the course to',
        )

    def handle(self, *args, **options):
        json_path = options['json_file']
        instructor_username = options['instructor']

        # Load JSON
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            raise CommandError(f'File not found: {json_path}')
        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid JSON: {e}')

        # Validate format
        if data.get('source') != 'proffaith':
            raise CommandError('Not a valid proffaith export file (missing source: proffaith)')

        # Find instructor
        try:
            instructor = User.objects.get(username=instructor_username)
        except User.DoesNotExist:
            raise CommandError(f'Instructor not found: {instructor_username}')

        if instructor.role not in ('instructor', 'admin'):
            raise CommandError(f'User {instructor_username} is not an instructor or admin')

        self.stdout.write(f'Importing course for instructor: {instructor.username}')

        with transaction.atomic():
            course = self._create_course(data['course'], instructor)
            objective_map = self._create_objectives(data.get('objectives', []), course)
            self._create_modules(data.get('modules', []), course, objective_map)

        self.stdout.write(self.style.SUCCESS(
            f'Successfully imported: "{course.title}" (slug: {course.slug})'
        ))

    def _create_course(self, course_data, instructor):
        """Create the Course record."""
        title = course_data['title']
        base_slug = slugify(title)

        # Ensure unique slug
        slug = base_slug
        counter = 1
        while Course.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        course = Course.objects.create(
            title=title,
            slug=slug,
            description=course_data.get('description', ''),
            instructor=instructor,
            status=Course.Status.DRAFT,
        )
        self.stdout.write(f'  Created course: {course.title}')
        return course

    def _create_objectives(self, objectives_data, course):
        """Create CourseObjective records. Returns code -> CourseObjective map."""
        objective_map = {}
        for obj_data in objectives_data:
            code = obj_data['code']
            objective = CourseObjective.objects.create(
                course=course,
                code=code,
                description=obj_data['description'],
                order=obj_data.get('order', 0),
            )
            objective_map[code] = objective

        if objective_map:
            self.stdout.write(f'  Created {len(objective_map)} objectives')
        return objective_map

    def _create_modules(self, modules_data, course, objective_map):
        """Create Module, Lesson, LessonContent, Quiz, Assignment records."""
        for mod_data in modules_data:
            module = Module.objects.create(
                course=course,
                title=mod_data['title'],
                description=mod_data.get('description', ''),
                order=mod_data.get('order', 0),
            )

            # Create lessons
            first_lesson = None
            for lesson_data in mod_data.get('lessons', []):
                lesson = Lesson.objects.create(
                    module=module,
                    title=lesson_data['title'],
                    description=lesson_data.get('description', ''),
                    order=lesson_data.get('order', 0),
                )
                if first_lesson is None:
                    first_lesson = lesson

                # Create lesson contents
                for content_data in lesson_data.get('contents', []):
                    LessonContent.objects.create(
                        lesson=lesson,
                        content_type=content_data.get('content_type', 'text'),
                        title=content_data.get('title', ''),
                        text_content=content_data.get('text_content', ''),
                        order=content_data.get('order', 0),
                    )

            # If no lessons were created, make a placeholder for quizzes/assignments
            if first_lesson is None:
                first_lesson = Lesson.objects.create(
                    module=module,
                    title=f'{mod_data["title"]} Overview',
                    description='',
                    order=0,
                )

            # Create quizzes
            for quiz_data in mod_data.get('quizzes', []):
                self._create_quiz(quiz_data, first_lesson, objective_map)

            # Create assignments
            for asgn_data in mod_data.get('assignments', []):
                self._create_assignment(asgn_data, first_lesson, objective_map)

        self.stdout.write(f'  Created {len(modules_data)} modules')

    def _create_quiz(self, quiz_data, lesson, objective_map):
        """Create a Quiz with Questions and AnswerChoices."""
        quiz = Quiz.objects.create(
            lesson=lesson,
            title=quiz_data['title'],
            passing_score=quiz_data.get('passing_score', 70),
            max_attempts=quiz_data.get('max_attempts', 0),
        )

        for q_data in quiz_data.get('questions', []):
            # Resolve objective
            course_objective = None
            obj_code = q_data.get('objective_code')
            if obj_code and obj_code in objective_map:
                course_objective = objective_map[obj_code]

            question = Question.objects.create(
                quiz=quiz,
                text=q_data['text'],
                question_type=q_data.get('question_type', 'multiple_choice'),
                points=q_data.get('points', 1),
                order=q_data.get('order', 0),
                course_objective=course_objective,
            )

            for choice_data in q_data.get('choices', []):
                AnswerChoice.objects.create(
                    question=question,
                    text=choice_data['text'],
                    is_correct=choice_data.get('is_correct', False),
                    order=choice_data.get('order', 0),
                )

    def _create_assignment(self, asgn_data, lesson, objective_map):
        """Create an Assignment record."""
        course_objective = None
        obj_code = asgn_data.get('objective_code')
        if obj_code and obj_code in objective_map:
            course_objective = objective_map[obj_code]

        Assignment.objects.create(
            lesson=lesson,
            title=asgn_data['title'],
            description=asgn_data.get('description', ''),
            max_score=asgn_data.get('max_score', 100),
            course_objective=course_objective,
        )
