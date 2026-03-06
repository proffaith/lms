from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsInstructorOrAdmin

from .models import CourseObjective, ObjectiveAlignment, Program, ProgramObjective
from .serializers import (
    CourseObjectiveCreateUpdateSerializer,
    CourseObjectiveSerializer,
    ObjectiveAlignmentSerializer,
    ProgramCreateUpdateSerializer,
    ProgramDetailSerializer,
    ProgramListSerializer,
    ProgramObjectiveSerializer,
)


class ProgramViewSet(viewsets.ModelViewSet):
    search_fields = ['title', 'description']
    filterset_fields = ['status']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProgramListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ProgramCreateUpdateSerializer
        return ProgramDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        return Program.objects.prefetch_related('objectives', 'courses')


class ProgramObjectiveViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramObjectiveSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        return ProgramObjective.objects.filter(
            program_id=self.kwargs['program_pk'],
        )

    def perform_create(self, serializer):
        serializer.save(program_id=self.kwargs['program_pk'])


class CourseObjectiveViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return CourseObjectiveCreateUpdateSerializer
        return CourseObjectiveSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def get_queryset(self):
        qs = CourseObjective.objects.prefetch_related('program_objectives')
        course_slug = self.kwargs.get('course_slug')
        if course_slug:
            qs = qs.filter(course__slug=course_slug)
        return qs

    def perform_create(self, serializer):
        from apps.courses.models import Course
        course = Course.objects.get(slug=self.kwargs['course_slug'])
        serializer.save(course=course)


class ObjectiveAlignView(APIView):
    permission_classes = [IsInstructorOrAdmin]

    def post(self, request, pk):
        """Link a course objective to a program objective."""
        serializer = ObjectiveAlignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course_obj = CourseObjective.objects.get(pk=pk)
        program_obj_id = serializer.validated_data['program_objective_id']
        _, created = ObjectiveAlignment.objects.get_or_create(
            course_objective=course_obj,
            program_objective_id=program_obj_id,
        )
        if not created:
            return Response(
                {'detail': 'Already aligned.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': 'Aligned successfully.'}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        """Unlink a course objective from a program objective."""
        program_obj_id = request.data.get('program_objective_id')
        deleted, _ = ObjectiveAlignment.objects.filter(
            course_objective_id=pk,
            program_objective_id=program_obj_id,
        ).delete()
        if not deleted:
            return Response(
                {'detail': 'Alignment not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
