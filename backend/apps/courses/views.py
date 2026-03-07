import json
import logging
import os

from django.core.files.base import ContentFile
from django.db import models, transaction
from django.utils.text import slugify
from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from apps.accounts.permissions import (
    IsCourseOwnerOrAdmin,
    IsEnrolledStudent,
    IsInstructorOrAdmin,
    IsStudent,
)

from .models import Course, Enrollment, Lesson, LessonContent, Module
from .serializers import (
    CourseCreateUpdateSerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    EnrollmentSerializer,
    LessonContentCreateUpdateSerializer,
    LessonContentSerializer,
    LessonCreateUpdateSerializer,
    LessonSerializer,
    ModuleCreateUpdateSerializer,
    ModuleSerializer,
)


class CourseViewSet(viewsets.ModelViewSet):
    lookup_field = 'slug'
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']
    filterset_fields = ['status', 'program']

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CourseCreateUpdateSerializer
        return CourseDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        if self.action == 'enroll':
            return [IsStudent()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        qs = Course.objects.select_related('instructor', 'program').prefetch_related(
            'enrollments', 'modules__lessons',
        )
        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(status='published')
        elif user.role == 'instructor':
            qs = qs.filter(
                models.Q(instructor=user) | models.Q(status='published')
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    def perform_destroy(self, instance):
        if self.request.user.role != 'admin' and instance.instructor != self.request.user:
            raise PermissionDenied('Only the course owner or an admin can delete a course.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def enroll(self, request, slug=None):
        course = self.get_object()
        if course.status != 'published':
            return Response(
                {'detail': 'Cannot enroll in unpublished course.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        _, created = Enrollment.objects.get_or_create(
            student=request.user, course=course,
        )
        if not created:
            return Response(
                {'detail': 'Already enrolled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': 'Enrolled successfully.'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def unenroll(self, request, slug=None):
        course = self.get_object()
        deleted, _ = Enrollment.objects.filter(
            student=request.user, course=course,
        ).delete()
        if not deleted:
            return Response(
                {'detail': 'Not enrolled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def archive(self, request, slug=None):
        course = self.get_object()
        course.status = Course.Status.ARCHIVED
        course.save(update_fields=['status'])
        return Response({'detail': 'Course archived.'})

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, slug=None):
        course = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = dict(Course.Status.choices)
        if new_status not in valid_statuses:
            return Response(
                {'detail': f'Invalid status. Choose from: {", ".join(valid_statuses.keys())}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course.status = new_status
        course.save(update_fields=['status'])
        return Response({'detail': f'Course status changed to {new_status}.'})


class ModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleSerializer

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ModuleCreateUpdateSerializer
        return ModuleSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        qs = Module.objects.select_related('course').prefetch_related('lessons')
        course_slug = self.kwargs.get('course_slug')
        if course_slug:
            qs = qs.filter(course__slug=course_slug)
        return qs

    def perform_create(self, serializer):
        course = Course.objects.get(slug=self.kwargs['course_slug'])
        self.check_object_permissions(self.request, course)
        serializer.save(course=course)


class LessonViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return LessonCreateUpdateSerializer
        if self.action == 'list':
            from .serializers import LessonListSerializer
            return LessonListSerializer
        return LessonSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        qs = Lesson.objects.select_related('module__course').prefetch_related('contents')
        module_id = self.kwargs.get('module_pk')
        if module_id:
            qs = qs.filter(module_id=module_id)
        return qs

    def perform_create(self, serializer):
        module = Module.objects.select_related('course').get(pk=self.kwargs['module_pk'])
        self.check_object_permissions(self.request, module)
        serializer.save(module=module)


class LessonContentViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return LessonContentCreateUpdateSerializer
        return LessonContentSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        qs = LessonContent.objects.select_related('lesson__module__course')
        lesson_id = self.kwargs.get('lesson_pk')
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

    def perform_create(self, serializer):
        lesson = Lesson.objects.select_related('module__course').get(pk=self.kwargs['lesson_pk'])
        self.check_object_permissions(self.request, lesson)
        serializer.save(lesson=lesson)


class EnrollmentListView(generics.ListAPIView):
    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        return Enrollment.objects.filter(
            student=self.request.user,
        ).select_related('course')


class CourseImportView(APIView):
    """Import a course from a proffaith JSON export file."""
    permission_classes = [IsInstructorOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response(
                {'detail': 'No file uploaded.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = json.loads(uploaded.read().decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            return Response(
                {'detail': f'Invalid JSON file: {e}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if data.get('source') != 'proffaith':
            return Response(
                {'detail': 'Not a valid proffaith export file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if updating an existing course
        course_slug = request.data.get('course_slug')

        try:
            with transaction.atomic():
                if course_slug:
                    # Update existing course
                    try:
                        course = Course.objects.get(slug=course_slug)
                    except Course.DoesNotExist:
                        return Response(
                            {'detail': f'Course with slug "{course_slug}" not found.'},
                            status=status.HTTP_404_NOT_FOUND,
                        )

                    # Permission check: admin or course owner
                    if request.user.role != 'admin' and course.instructor != request.user:
                        return Response(
                            {'detail': 'You do not have permission to update this course.'},
                            status=status.HTTP_403_FORBIDDEN,
                        )

                    self._update_import(data, course)
                    resp_status = status.HTTP_200_OK
                    detail = 'Course updated successfully.'
                else:
                    # Create new course
                    course = self._create_course(data, request.user)
                    self._create_content(data, course)
                    resp_status = status.HTTP_201_CREATED
                    detail = 'Course imported successfully.'
        except Exception as e:
            return Response(
                {'detail': f'Import failed: {e}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                'detail': detail,
                'slug': course.slug,
                'title': course.title,
            },
            status=resp_status,
        )

    def _create_course(self, data, instructor):
        """Create a new course record with a unique slug."""
        course_data = data['course']
        title = course_data['title']
        base_slug = slugify(title)
        slug = base_slug
        counter = 1
        while Course.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        return Course.objects.create(
            title=title,
            slug=slug,
            description=course_data.get('description', ''),
            instructor=instructor,
            status=Course.Status.DRAFT,
        )

    def _update_import(self, data, course):
        """Replace all content of an existing course with imported data."""
        from apps.curriculum.models import CourseObjective

        # Update course metadata (preserve slug, status, instructor, enrollments)
        course_data = data['course']
        course.title = course_data['title']
        course.description = course_data.get('description', '')
        course.save(update_fields=['title', 'description'])

        # Delete old content (cascade removes lessons, contents, quizzes, etc.)
        CourseObjective.objects.filter(course=course).delete()
        course.modules.all().delete()

        # Re-create content from import data
        self._create_content(data, course)

    def _download_s3_file(self, s3_key: str, s3_bucket: str = '') -> bytes | None:
        """Download a file from S3. Returns bytes or None on failure."""
        try:
            import boto3
        except ImportError:
            logger.warning("boto3 not installed — cannot download S3 files")
            return None

        aws_key = os.environ.get('AWS_ACCESS_KEY')
        aws_secret = os.environ.get('AWS_SECRET_ACCESS_KEY')
        region = os.environ.get('AWS_REGION', 'us-east-2')
        bucket = s3_bucket or os.environ.get('AWS_S3_BUCKET', 'proffaith-uploads')

        if not aws_key or not aws_secret:
            logger.warning("AWS credentials not configured — cannot download S3 files")
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
            logger.warning(f"Failed to download s3://{bucket}/{s3_key}: {e}")
            return None

    def _create_content(self, data, course):
        """Create objectives, modules, lessons, contents, quizzes, and assignments."""
        from apps.assessments.models import (
            AnswerChoice, Assignment, Question, Quiz,
        )
        from apps.curriculum.models import CourseObjective

        # Create objectives
        objective_map = {}
        for obj_data in data.get('objectives', []):
            code = obj_data['code']
            objective_map[code] = CourseObjective.objects.create(
                course=course,
                code=code,
                description=obj_data['description'],
                order=obj_data.get('order', 0),
            )

        # Create modules
        for mod_data in data.get('modules', []):
            module = Module.objects.create(
                course=course,
                title=mod_data['title'],
                description=mod_data.get('description', ''),
                order=mod_data.get('order', 0),
            )

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
                        # Download file from S3 and save to Django FileField
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
                        else:
                            # S3 download failed — fall back to text with info
                            lc.content_type = 'text'
                            lc.text_content = (
                                f'<p><em>File not available: '
                                f'{content_data.get("title", content_data.get("filename", "unknown"))}'
                                f'</em></p>'
                            )
                        lc.save()
                    else:
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
                    order=0,
                )

            # Quizzes
            for quiz_data in mod_data.get('quizzes', []):
                quiz = Quiz.objects.create(
                    lesson=first_lesson,
                    title=quiz_data['title'],
                    passing_score=quiz_data.get('passing_score', 70),
                    max_attempts=quiz_data.get('max_attempts', 0),
                )
                for q_data in quiz_data.get('questions', []):
                    obj_code = q_data.get('objective_code')
                    question = Question.objects.create(
                        quiz=quiz,
                        text=q_data['text'],
                        question_type=q_data.get('question_type', 'multiple_choice'),
                        points=q_data.get('points', 1),
                        order=q_data.get('order', 0),
                        course_objective=objective_map.get(obj_code),
                    )
                    for choice in q_data.get('choices', []):
                        AnswerChoice.objects.create(
                            question=question,
                            text=choice['text'],
                            is_correct=choice.get('is_correct', False),
                            order=choice.get('order', 0),
                        )

            # Assignments
            for asgn_data in mod_data.get('assignments', []):
                obj_code = asgn_data.get('objective_code')
                Assignment.objects.create(
                    lesson=first_lesson,
                    title=asgn_data['title'],
                    description=asgn_data.get('description', ''),
                    max_score=asgn_data.get('max_score', 100),
                    course_objective=objective_map.get(obj_code),
                )
