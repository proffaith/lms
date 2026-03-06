from rest_framework import serializers

from .models import (
    AnswerChoice,
    Assignment,
    Question,
    Quiz,
    QuizAnswer,
    QuizAttempt,
    Submission,
)


# --- Instructor serializers (include correct answers) ---

class AnswerChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerChoice
        fields = ['id', 'text', 'is_correct', 'order']


class QuestionSerializer(serializers.ModelSerializer):
    choices = AnswerChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'text', 'question_type', 'points',
            'order', 'course_objective', 'choices',
        ]


class QuestionCreateSerializer(serializers.ModelSerializer):
    choices = AnswerChoiceSerializer(many=True)

    class Meta:
        model = Question
        fields = ['text', 'question_type', 'points', 'order', 'course_objective', 'choices']

    def create(self, validated_data):
        choices_data = validated_data.pop('choices')
        question = Question.objects.create(**validated_data)
        for choice_data in choices_data:
            AnswerChoice.objects.create(question=question, **choice_data)
        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if choices_data is not None:
            instance.choices.all().delete()
            for choice_data in choices_data:
                AnswerChoice.objects.create(question=instance, **choice_data)
        return instance


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'passing_score',
            'time_limit_minutes', 'max_attempts', 'questions',
            'question_count', 'created_at', 'updated_at',
        ]

    def get_question_count(self, obj):
        return obj.questions.count()


class QuizCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['title', 'description', 'passing_score', 'time_limit_minutes', 'max_attempts']


# --- Student serializers (hide correct answers) ---

class AnswerChoiceStudentSerializer(serializers.ModelSerializer):
    """No is_correct field — students can't see the answer."""
    class Meta:
        model = AnswerChoice
        fields = ['id', 'text', 'order']


class QuestionStudentSerializer(serializers.ModelSerializer):
    choices = AnswerChoiceStudentSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'points', 'order', 'choices']


class QuizStudentSerializer(serializers.ModelSerializer):
    """Quiz for students taking it — questions without correct answers."""
    questions = QuestionStudentSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'passing_score',
            'time_limit_minutes', 'max_attempts', 'questions',
        ]


# --- Quiz attempt serializers ---

class QuizSubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_choice_id = serializers.IntegerField()


class QuizSubmitSerializer(serializers.Serializer):
    answers = QuizSubmitAnswerSerializer(many=True)


class QuizAnswerResultSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    selected_choice_text = serializers.CharField(
        source='selected_choice.text', read_only=True,
    )

    class Meta:
        model = QuizAnswer
        fields = ['question_id', 'question_text', 'selected_choice_text', 'is_correct']


class QuizAttemptSerializer(serializers.ModelSerializer):
    answers = QuizAnswerResultSerializer(many=True, read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'score', 'total_points', 'earned_points',
            'passed', 'started_at', 'completed_at', 'answers',
        ]


class QuizAttemptListSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ['id', 'score', 'passed', 'started_at', 'completed_at']


# --- Assignment serializers ---

class AssignmentSerializer(serializers.ModelSerializer):
    submission_count = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'title', 'description', 'due_date', 'max_score',
            'course_objective', 'submission_count', 'created_at', 'updated_at',
        ]

    def get_submission_count(self, obj):
        return obj.submissions.count()


class AssignmentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ['title', 'description', 'due_date', 'max_score', 'course_objective']


class SubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='student.get_full_name', read_only=True,
    )

    class Meta:
        model = Submission
        fields = [
            'id', 'student', 'student_name', 'file', 'text_content',
            'status', 'score', 'feedback', 'submitted_at', 'graded_at',
        ]
        read_only_fields = ['id', 'student', 'status', 'score', 'feedback', 'submitted_at', 'graded_at']


class SubmissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ['file', 'text_content']


class GradeSubmissionSerializer(serializers.Serializer):
    score = serializers.DecimalField(max_digits=5, decimal_places=2)
    feedback = serializers.CharField(required=False, allow_blank=True, default='')
