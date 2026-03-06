from apps.courses.models import Enrollment, Lesson

from .models import Certificate, LessonProgress


def get_course_progress(student, course):
    """Calculate course completion percentage for a student."""
    total_lessons = Lesson.objects.filter(module__course=course).count()
    if total_lessons == 0:
        return 0
    completed = LessonProgress.objects.filter(
        student=student,
        lesson__module__course=course,
        completed=True,
    ).count()
    return round((completed / total_lessons) * 100, 1)


def check_and_issue_certificate(student, course):
    """
    Issue a certificate if the student has completed all lessons
    and passed all required quizzes.
    """
    from apps.assessments.models import Quiz, QuizAttempt

    # Check 100% lesson completion
    total_lessons = Lesson.objects.filter(module__course=course).count()
    if total_lessons == 0:
        return None

    completed_lessons = LessonProgress.objects.filter(
        student=student,
        lesson__module__course=course,
        completed=True,
    ).count()

    if completed_lessons < total_lessons:
        return None

    # Check all quizzes passed
    quizzes = Quiz.objects.filter(lesson__module__course=course)
    for quiz in quizzes:
        passed = QuizAttempt.objects.filter(
            student=student, quiz=quiz, passed=True,
        ).exists()
        if not passed:
            return None

    # Issue certificate
    enrollment = Enrollment.objects.get(student=student, course=course)
    certificate, created = Certificate.objects.get_or_create(enrollment=enrollment)
    return certificate if created else None
