"""
Import a course from a proffaith JSON export file.

Usage:
    python manage.py import_course path/to/export.json --instructor <username>
"""

import json
import logging
import os
import re

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import models, transaction
from django.utils.text import slugify

logger = logging.getLogger(__name__)

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

            # Create lessons and non-text content first
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

                for content_data in lesson_data.get('contents', []):
                    content_type = content_data.get('content_type', 'text')

                    if content_type == 'file' and content_data.get('s3_key'):
                        lc = LessonContent(
                            lesson=lesson,
                            content_type='file',
                            title=content_data.get('title', ''),
                            order=content_data.get('order', 0),
                        )
                        file_bytes = self._download_s3_file(
                            content_data['s3_key'],
                            content_data.get('s3_bucket', ''),
                        )
                        if file_bytes:
                            filename = content_data.get('filename', 'file.pdf')
                            lc.file.save(filename, ContentFile(file_bytes), save=False)
                            self.stdout.write(f'    Downloaded: {filename}')
                        else:
                            lc.content_type = 'text'
                            lc.text_content = (
                                f'<p><em>File not available: '
                                f'{content_data.get("title", content_data.get("filename", "unknown"))}'
                                f'</em></p>'
                            )
                            self.stdout.write(
                                self.style.WARNING(
                                    f'    Could not download: {content_data.get("filename", "unknown")}'
                                )
                            )
                        lc.save()
                    elif content_type != 'text':
                        LessonContent.objects.create(
                            lesson=lesson,
                            content_type=content_type,
                            title=content_data.get('title', ''),
                            text_content=content_data.get('text_content', ''),
                            order=content_data.get('order', 0),
                        )

            if first_lesson is None:
                first_lesson = Lesson.objects.create(
                    module=module,
                    title=f'{mod_data["title"]} Overview',
                    description='',
                    order=0,
                )

            # Create quizzes BEFORE text content (need IDs for link resolution)
            quiz_map = {}
            for quiz_data in mod_data.get('quizzes', []):
                quiz = self._create_quiz(quiz_data, first_lesson, objective_map)
                quiz_map[quiz_data['title']] = quiz.id

            # Create assignments BEFORE text content
            assignment_map = {}
            for asgn_data in mod_data.get('assignments', []):
                asgn = self._create_assignment(asgn_data, first_lesson, objective_map)
                assignment_map[asgn_data['title']] = asgn.id

            # Now create text content with checklist link resolution
            checklist_items = mod_data.get('checklist', [])
            for lesson_data in mod_data.get('lessons', []):
                lesson_obj = Lesson.objects.get(
                    module=module,
                    title=lesson_data['title'],
                    order=lesson_data.get('order', 0),
                )
                for content_data in lesson_data.get('contents', []):
                    content_type = content_data.get('content_type', 'text')
                    if content_type != 'text':
                        continue

                    text = content_data.get('text_content', '')

                    if checklist_items and '[INSERT LINK:' in text:
                        text = self._resolve_checklist_links(
                            text, checklist_items,
                            quiz_map, assignment_map, lesson_obj,
                        )

                    LessonContent.objects.create(
                        lesson=lesson_obj,
                        content_type='text',
                        title=content_data.get('title', ''),
                        text_content=text,
                        order=content_data.get('order', 0),
                    )

        self.stdout.write(f'  Created {len(modules_data)} modules')

    def _create_quiz(self, quiz_data, lesson, objective_map):
        """Create a Quiz with Questions and AnswerChoices. Returns the Quiz."""
        quiz = Quiz.objects.create(
            lesson=lesson,
            title=quiz_data['title'],
            passing_score=quiz_data.get('passing_score', 70),
            max_attempts=quiz_data.get('max_attempts', 0),
        )

        for q_data in quiz_data.get('questions', []):
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

        return quiz

    def _download_s3_file(self, s3_key: str, s3_bucket: str = '') -> bytes | None:
        """Download a file from S3. Returns bytes or None on failure."""
        try:
            import boto3
        except ImportError:
            self.stdout.write(self.style.WARNING('boto3 not installed — cannot download S3 files'))
            return None

        aws_key = os.environ.get('AWS_ACCESS_KEY')
        aws_secret = os.environ.get('AWS_SECRET_ACCESS_KEY')
        region = os.environ.get('AWS_REGION', 'us-east-2')
        bucket = s3_bucket or os.environ.get('AWS_S3_BUCKET', 'proffaith-uploads')

        if not aws_key or not aws_secret:
            self.stdout.write(self.style.WARNING('AWS credentials not configured'))
            return None

        try:
            client = boto3.client(
                's3',
                aws_access_key_id=aws_key,
                aws_secret_access_key=aws_secret,
                region_name=region,
            )
            response = client.get_object(Bucket=bucket, Key=s3_key)
            return response['Body'].read()
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'S3 download failed for {s3_key}: {e}'))
            return None

    def _create_assignment(self, asgn_data, lesson, objective_map):
        """Create an Assignment record. Returns the Assignment."""
        course_objective = None
        obj_code = asgn_data.get('objective_code')
        if obj_code and obj_code in objective_map:
            course_objective = objective_map[obj_code]

        return Assignment.objects.create(
            lesson=lesson,
            title=asgn_data['title'],
            description=asgn_data.get('description', ''),
            max_score=asgn_data.get('max_score', 100),
            course_objective=course_objective,
        )

    def _resolve_checklist_links(self, html, checklist_items, quiz_map, assignment_map, lesson):
        """Replace [INSERT LINK: X] placeholders with actual <a> tags."""
        link_map = {}

        for item in checklist_items:
            placeholder = item.get('link_placeholder') or item.get('label', '')
            task_type = item.get('task_type', '')

            if item.get('url'):
                link_map[placeholder] = item['url']
            elif item.get('ref_title'):
                ref = item['ref_title']
                if task_type == 'quiz' and ref in quiz_map:
                    link_map[placeholder] = f'/quizzes/{quiz_map[ref]}'
                elif ref in assignment_map:
                    link_map[placeholder] = f'/assignments/{assignment_map[ref]}'
                elif ref in quiz_map:
                    link_map[placeholder] = f'/quizzes/{quiz_map[ref]}'
            elif item.get('s3_key') or item.get('filename'):
                filename = item.get('filename', '')
                title = item.get('label', filename)
                matching = LessonContent.objects.filter(
                    lesson=lesson,
                    content_type='file',
                ).filter(
                    models.Q(title__icontains=filename) |
                    models.Q(title__icontains=title)
                ).first()
                if matching and matching.file:
                    link_map[placeholder] = matching.file.url

        if not link_map:
            return html

        def replace_placeholder(match):
            label = match.group(1).strip()
            url = link_map.get(label)
            if url:
                target = ' target="_blank" rel="noopener noreferrer"' if url.startswith('http') else ''
                return (
                    f'<a href="{url}"{target} '
                    f'style="color: #2563eb; text-decoration: underline; font-weight: 500;">'
                    f'{label}</a>'
                )
            return match.group(0)

        return re.sub(r'🔗\s*\[INSERT LINK:\s*(.+?)\]', replace_placeholder, html)
