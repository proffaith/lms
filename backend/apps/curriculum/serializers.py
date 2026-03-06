from rest_framework import serializers

from .models import CourseObjective, ObjectiveAlignment, Program, ProgramObjective


class ProgramObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramObjective
        fields = ['id', 'code', 'description', 'order']


class ProgramListSerializer(serializers.ModelSerializer):
    objective_count = serializers.SerializerMethodField()
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = ['id', 'title', 'description', 'status', 'objective_count', 'course_count', 'created_at']

    def get_objective_count(self, obj):
        return obj.objectives.count()

    def get_course_count(self, obj):
        return obj.courses.count()


class ProgramDetailSerializer(serializers.ModelSerializer):
    objectives = ProgramObjectiveSerializer(many=True, read_only=True)

    class Meta:
        model = Program
        fields = [
            'id', 'title', 'description', 'status',
            'objectives', 'created_at', 'updated_at',
        ]


class ProgramCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = ['title', 'description', 'status']


class CourseObjectiveSerializer(serializers.ModelSerializer):
    aligned_program_objectives = serializers.SerializerMethodField()

    class Meta:
        model = CourseObjective
        fields = ['id', 'code', 'description', 'order', 'aligned_program_objectives']

    def get_aligned_program_objectives(self, obj):
        return ProgramObjectiveSerializer(
            obj.program_objectives.all(), many=True,
        ).data


class CourseObjectiveCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseObjective
        fields = ['code', 'description', 'order']


class ObjectiveAlignmentSerializer(serializers.Serializer):
    program_objective_id = serializers.IntegerField()
