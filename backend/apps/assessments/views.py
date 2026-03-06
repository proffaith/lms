from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import (
    IsCourseOwnerOrAdmin,
    IsEnrolledStudent,
    IsInstructorOrAdmin,
    IsStudent,
)

from .models import Assignment, Quiz, QuizAttempt, Submission
from .serializers import (
    AssignmentCreateUpdateSerializer,
    AssignmentSerializer,
    GradeSubmissionSerializer,
    QuestionCreateSerializer,
    QuestionSerializer,
    QuizAttemptListSerializer,
    QuizAttemptSerializer,
    QuizCreateUpdateSerializer,
    QuizSerializer,
    QuizStudentSerializer,
    QuizSubmitSerializer,
    SubmissionCreateSerializer,
    SubmissionSerializer,
)
from .services import grade_quiz_attempt


class QuizViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return QuizCreateUpdateSerializer
        return QuizSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        qs = Quiz.objects.prefetch_related('questions__choices')
        lesson_id = self.kwargs.get('lesson_pk')
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

    def perform_create(self, serializer):
        from apps.courses.models import Lesson
        lesson = Lesson.objects.get(pk=self.kwargs['lesson_pk'])
        serializer.save(lesson=lesson)


class QuestionViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return QuestionCreateSerializer
        return QuestionSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        from .models import Question
        qs = Question.objects.prefetch_related('choices')
        quiz_id = self.kwargs.get('quiz_pk')
        if quiz_id:
            qs = qs.filter(quiz_id=quiz_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(quiz_id=self.kwargs['quiz_pk'])


class QuizTakeView(APIView):
    """GET: return quiz questions without correct answers for a student."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        quiz = Quiz.objects.prefetch_related('questions__choices').get(pk=pk)
        serializer = QuizStudentSerializer(quiz)
        return Response(serializer.data)


class QuizSubmitView(APIView):
    """POST: submit quiz answers, auto-grade, return results."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        quiz = Quiz.objects.get(pk=pk)

        # Check max attempts
        if quiz.max_attempts > 0:
            attempt_count = QuizAttempt.objects.filter(
                quiz=quiz, student=request.user, completed_at__isnull=False,
            ).count()
            if attempt_count >= quiz.max_attempts:
                return Response(
                    {'detail': f'Maximum attempts ({quiz.max_attempts}) reached.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        attempt = QuizAttempt.objects.create(quiz=quiz, student=request.user)
        attempt = grade_quiz_attempt(attempt, serializer.validated_data['answers'])

        return Response(
            QuizAttemptSerializer(attempt).data,
            status=status.HTTP_201_CREATED,
        )


class QuizAttemptsView(APIView):
    """GET: list my attempts for a quiz."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        attempts = QuizAttempt.objects.filter(
            quiz_id=pk, student=request.user,
        )
        serializer = QuizAttemptListSerializer(attempts, many=True)
        return Response(serializer.data)


class AssignmentViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return AssignmentCreateUpdateSerializer
        return AssignmentSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        qs = Assignment.objects.prefetch_related('submissions')
        lesson_id = self.kwargs.get('lesson_pk')
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

    def perform_create(self, serializer):
        from apps.courses.models import Lesson
        lesson = Lesson.objects.get(pk=self.kwargs['lesson_pk'])
        serializer.save(lesson=lesson)


class SubmissionCreateView(APIView):
    """POST: submit an assignment (student)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        assignment = Assignment.objects.get(pk=pk)
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission = serializer.save(
            assignment=assignment, student=request.user,
        )
        return Response(
            SubmissionSerializer(submission).data,
            status=status.HTTP_201_CREATED,
        )


class SubmissionListView(APIView):
    """GET: list submissions for an assignment (instructor)."""
    permission_classes = [IsInstructorOrAdmin]

    def get(self, request, pk):
        submissions = Submission.objects.filter(
            assignment_id=pk,
        ).select_related('student')
        serializer = SubmissionSerializer(submissions, many=True)
        return Response(serializer.data)


class SubmissionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        submission = Submission.objects.select_related('student', 'assignment').get(pk=pk)
        # Students can only see their own submissions
        if request.user.role == 'student' and submission.student != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = SubmissionSerializer(submission)
        return Response(serializer.data)


class GradeSubmissionView(APIView):
    """PATCH: grade a submission (instructor)."""
    permission_classes = [IsInstructorOrAdmin]

    def patch(self, request, pk):
        submission = Submission.objects.get(pk=pk)
        serializer = GradeSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission.score = serializer.validated_data['score']
        submission.feedback = serializer.validated_data.get('feedback', '')
        submission.status = 'graded'
        submission.graded_at = timezone.now()
        submission.save()
        return Response(SubmissionSerializer(submission).data)
