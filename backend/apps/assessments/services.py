from django.utils import timezone

from .models import AnswerChoice, Question, QuizAnswer


def grade_quiz_attempt(attempt, submitted_answers):
    """
    Auto-grade a quiz attempt.

    Args:
        attempt: QuizAttempt instance
        submitted_answers: list of {'question_id': int, 'selected_choice_id': int}

    Returns:
        The graded QuizAttempt instance.
    """
    total_points = 0
    earned_points = 0

    for answer_data in submitted_answers:
        question = Question.objects.get(
            id=answer_data['question_id'],
            quiz=attempt.quiz,
        )
        choice = AnswerChoice.objects.get(
            id=answer_data['selected_choice_id'],
            question=question,
        )

        is_correct = choice.is_correct
        total_points += question.points
        if is_correct:
            earned_points += question.points

        QuizAnswer.objects.create(
            attempt=attempt,
            question=question,
            selected_choice=choice,
            is_correct=is_correct,
        )

    score = (earned_points / total_points * 100) if total_points > 0 else 0

    attempt.total_points = total_points
    attempt.earned_points = earned_points
    attempt.score = round(score, 2)
    attempt.passed = score >= attempt.quiz.passing_score
    attempt.completed_at = timezone.now()
    attempt.save()

    return attempt
