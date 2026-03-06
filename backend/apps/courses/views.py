from django.db import models
from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

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
