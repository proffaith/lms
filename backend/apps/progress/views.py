from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Course, Enrollment, Lesson

from .models import Certificate, LessonProgress
from .serializers import (
    CertificateSerializer,
    CourseProgressSerializer,
    LessonProgressSerializer,
)
from .services import check_and_issue_certificate, get_course_progress


class MarkLessonCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        lesson = Lesson.objects.select_related('module__course').get(pk=pk)
        progress, created = LessonProgress.objects.get_or_create(
            student=request.user,
            lesson=lesson,
        )
        if progress.completed:
            return Response({'detail': 'Already completed.'})

        progress.completed = True
        progress.completed_at = timezone.now()
        progress.save()

        course = lesson.module.course
        certificate = check_and_issue_certificate(request.user, course)

        response_data = {'detail': 'Lesson marked as completed.'}
        if certificate:
            response_data['certificate_id'] = str(certificate.id)
            response_data['message'] = 'Congratulations! You earned a certificate!'

        return Response(response_data)


class CourseProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        course = Course.objects.get(slug=slug)
        total = Lesson.objects.filter(module__course=course).count()
        completed = LessonProgress.objects.filter(
            student=request.user,
            lesson__module__course=course,
            completed=True,
        ).count()

        lessons = Lesson.objects.filter(
            module__course=course,
        ).select_related('module').order_by('module__order', 'order')

        progress_records = {
            lp.lesson_id: lp
            for lp in LessonProgress.objects.filter(
                student=request.user,
                lesson__module__course=course,
            )
        }

        lesson_data = []
        for lesson in lessons:
            lp = progress_records.get(lesson.id)
            lesson_data.append({
                'lesson_id': lesson.id,
                'lesson_title': lesson.title,
                'module_title': lesson.module.title,
                'completed': lp.completed if lp else False,
                'completed_at': lp.completed_at if lp else None,
            })

        return Response({
            'course_slug': slug,
            'total_lessons': total,
            'completed_lessons': completed,
            'progress_percentage': round((completed / total * 100), 1) if total > 0 else 0,
            'lessons': lesson_data,
        })


class DashboardProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enrollments = Enrollment.objects.filter(
            student=request.user,
        ).select_related('course')

        progress_list = []
        for enrollment in enrollments:
            course = enrollment.course
            total = Lesson.objects.filter(module__course=course).count()
            completed = LessonProgress.objects.filter(
                student=request.user,
                lesson__module__course=course,
                completed=True,
            ).count()
            progress_list.append({
                'course_id': course.id,
                'course_title': course.title,
                'course_slug': course.slug,
                'total_lessons': total,
                'completed_lessons': completed,
                'progress_percentage': round((completed / total * 100), 1) if total > 0 else 0,
            })

        serializer = CourseProgressSerializer(progress_list, many=True)
        return Response(serializer.data)


class CertificateDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, uuid):
        try:
            certificate = Certificate.objects.select_related(
                'enrollment__student', 'enrollment__course',
            ).get(pk=uuid)
        except Certificate.DoesNotExist:
            return Response(
                {'detail': 'Certificate not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CertificateSerializer(certificate)
        return Response(serializer.data)


class MyCertificatesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        certificates = Certificate.objects.filter(
            enrollment__student=request.user,
        ).select_related('enrollment__course')
        serializer = CertificateSerializer(certificates, many=True)
        return Response(serializer.data)
