from rest_framework import serializers

from .models import Certificate, LessonProgress


class LessonProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = LessonProgress
        fields = ['id', 'lesson', 'lesson_title', 'completed', 'completed_at', 'last_accessed_at']
        read_only_fields = ['id', 'completed_at', 'last_accessed_at']


class CourseProgressSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    course_title = serializers.CharField()
    course_slug = serializers.CharField()
    total_lessons = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    progress_percentage = serializers.FloatField()


class CertificateSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='enrollment.course.title', read_only=True)
    course_slug = serializers.CharField(source='enrollment.course.slug', read_only=True)

    class Meta:
        model = Certificate
        fields = ['id', 'student_name', 'course_title', 'course_slug', 'issued_at']

    def get_student_name(self, obj):
        return obj.enrollment.student.get_full_name() or obj.enrollment.student.username
