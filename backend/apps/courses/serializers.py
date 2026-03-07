from django.utils.text import slugify
from rest_framework import serializers

from apps.accounts.serializers import UserMinimalSerializer

from .models import Course, Enrollment, Lesson, LessonContent, Module


class LessonContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonContent
        fields = [
            'id', 'content_type', 'title', 'text_content',
            'video_url', 'file', 'order',
        ]


class LessonSerializer(serializers.ModelSerializer):
    contents = LessonContentSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'order', 'contents', 'created_at', 'updated_at']


class LessonListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'order']


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonListSerializer(many=True, read_only=True)
    quiz_count = serializers.SerializerMethodField()
    assignment_count = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'order', 'lessons', 'quiz_count', 'assignment_count']

    def get_quiz_count(self, obj):
        from apps.assessments.models import Quiz
        return Quiz.objects.filter(lesson__module=obj).count()

    def get_assignment_count(self, obj):
        from apps.assessments.models import Assignment
        return Assignment.objects.filter(lesson__module=obj).count()


class CourseListSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(
        source='instructor.get_full_name', read_only=True,
    )
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'thumbnail',
            'instructor_name', 'status', 'enrollment_count',
            'program', 'created_at',
        ]

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


class CourseDetailSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)
    instructor = UserMinimalSerializer(read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'thumbnail',
            'instructor', 'status', 'program', 'modules',
            'is_enrolled', 'enrollment_count',
            'created_at', 'updated_at',
        ]

    def get_is_enrolled(self, obj):
        user = self.context['request'].user
        if user.is_anonymous:
            return False
        return obj.enrollments.filter(student=user).exists()

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'title', 'slug', 'description', 'thumbnail',
            'program', 'status',
        ]

    def validate_slug(self, value):
        return slugify(value) if value else value

    def create(self, validated_data):
        if not validated_data.get('slug'):
            validated_data['slug'] = slugify(validated_data['title'])
        return super().create(validated_data)


class ModuleCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['title', 'description', 'order']


class LessonCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['title', 'description', 'order']


class LessonContentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonContent
        fields = ['content_type', 'title', 'text_content', 'video_url', 'file', 'order']


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_slug = serializers.CharField(source='course.slug', read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'course', 'course_title', 'course_slug', 'enrolled_at']
        read_only_fields = ['id', 'enrolled_at']
