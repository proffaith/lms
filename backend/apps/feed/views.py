from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsInstructorOrAdmin
from apps.courses.models import Course, Enrollment

from .models import FeedBookmark, FeedItem, FeedReaction, FeedResponse
from .serializers import (
    EngagementProfileSerializer,
    FeedBookmarkCreateSerializer,
    FeedBookmarkSerializer,
    FeedItemCreateSerializer,
    FeedItemDetailSerializer,
    FeedItemListSerializer,
    FeedReactionSerializer,
    FeedResponseCreateSerializer,
    FeedResponseSerializer,
)
from .services import compute_engagement_profile, get_ranked_feed


# ── Permissions ───────────────────────────────────────────


class IsEnrolledOrInstructorOrAdmin(permissions.BasePermission):
    """User must be enrolled in the course, or be the instructor/admin."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role in ('admin', 'instructor'):
            return True
        course_slug = view.kwargs.get('course_slug')
        if course_slug:
            return Enrollment.objects.filter(
                student=request.user, course__slug=course_slug,
            ).exists()
        return True


# ── FeedItem ──────────────────────────────────────────────


class FeedItemViewSet(viewsets.ModelViewSet):
    """
    Feed items for a course.

    List/Create: GET/POST /courses/{course_slug}/feed/
    Retrieve/Update/Delete: /feed-items/{pk}/
    """

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return FeedItemCreateSerializer
        if self.action == 'list':
            return FeedItemListSerializer
        return FeedItemDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsEnrolledOrInstructorOrAdmin()]
        if self.action == 'create':
            return [IsEnrolledOrInstructorOrAdmin()]
        if self.action in ('pin', 'feature'):
            return [IsInstructorOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = FeedItem.objects.select_related(
            'author', 'course_objective', 'related_item',
        ).prefetch_related('responses', 'bookmarks')
        course_slug = self.kwargs.get('course_slug')
        if course_slug:
            qs = qs.filter(course__slug=course_slug)
        return qs

    def list(self, request, *args, **kwargs):
        """Use algorithmic ranking instead of default queryset ordering."""
        course_slug = self.kwargs.get('course_slug')
        course = Course.objects.get(slug=course_slug)

        page = int(request.query_params.get('page', 1))
        page_size = 20
        offset = (page - 1) * page_size

        items = get_ranked_feed(course, request.user, page_size + 1, offset)
        has_next = len(items) > page_size
        items = items[:page_size]

        serializer = self.get_serializer(items, many=True)
        return Response({
            'count': FeedItem.objects.filter(course=course).count(),
            'next': f'?page={page + 1}' if has_next else None,
            'previous': f'?page={page - 1}' if page > 1 else None,
            'results': serializer.data,
        })

    def perform_create(self, serializer):
        course = Course.objects.get(slug=self.kwargs['course_slug'])
        serializer.save(course=course, author=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if user.role == 'student' and instance.author != user:
            raise PermissionDenied('You can only edit your own posts.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'student' and instance.author != user:
            raise PermissionDenied('You can only delete your own posts.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        item = self.get_object()
        item.is_pinned = not item.is_pinned
        item.save(update_fields=['is_pinned'])
        return Response({'is_pinned': item.is_pinned})

    @action(detail=True, methods=['post'])
    def feature(self, request, pk=None):
        item = self.get_object()
        item.is_featured = not item.is_featured
        item.save(update_fields=['is_featured'])
        return Response({'is_featured': item.is_featured})


# ── FeedResponse ──────────────────────────────────────────


class FeedResponseViewSet(viewsets.ModelViewSet):
    """
    Responses on feed items (threaded).

    List/Create: /feed-items/{item_pk}/responses/
    Retrieve/Update/Delete: /feed-responses/{pk}/
    """

    def get_serializer_class(self):
        if self.action == 'create':
            return FeedResponseCreateSerializer
        return FeedResponseSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = FeedResponse.objects.select_related('author').prefetch_related(
            'replies__author',
        )
        item_pk = self.kwargs.get('item_pk')
        if item_pk:
            # Only top-level responses; replies are nested via serializer
            qs = qs.filter(feed_item_id=item_pk, parent__isnull=True)
        return qs

    def perform_create(self, serializer):
        item = FeedItem.objects.get(pk=self.kwargs['item_pk'])
        serializer.save(feed_item=item, author=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.author != self.request.user:
            raise PermissionDenied('You can only edit your own responses.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'student' and instance.author != user:
            raise PermissionDenied('You can only delete your own responses.')
        instance.delete()


# ── FeedReaction ──────────────────────────────────────────


class FeedReactionToggleView(APIView):
    """POST: toggle a reaction (create if absent, delete if exists)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = FeedReactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reaction, created = FeedReaction.objects.get_or_create(
            author=request.user,
            reaction_type=serializer.validated_data['reaction_type'],
            target_type=serializer.validated_data['target_type'],
            target_id=serializer.validated_data['target_id'],
        )
        if not created:
            reaction.delete()
            return Response({'toggled': 'removed'}, status=status.HTTP_200_OK)
        return Response(
            {'toggled': 'added', 'id': reaction.id},
            status=status.HTTP_201_CREATED,
        )


# ── FeedBookmark ──────────────────────────────────────────


class FeedBookmarkViewSet(viewsets.ModelViewSet):
    """
    Bookmarks for feed items.

    List: GET /courses/{course_slug}/feed/bookmarks/
    Create: POST /feed-bookmarks/
    Update/Delete: /feed-bookmarks/{pk}/
    """

    def get_serializer_class(self):
        if self.action == 'create':
            return FeedBookmarkCreateSerializer
        return FeedBookmarkSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = FeedBookmark.objects.filter(
            user=self.request.user,
        ).select_related('feed_item')
        course_slug = self.kwargs.get('course_slug')
        if course_slug:
            qs = qs.filter(feed_item__course__slug=course_slug)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ── Engagement ────────────────────────────────────────────


class MyEngagementView(APIView):
    """GET: student's own engagement profile for a course."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        course = Course.objects.get(slug=slug)
        profile = compute_engagement_profile(request.user, course)
        serializer = EngagementProfileSerializer(profile)
        return Response(serializer.data)


class EngagementRosterView(APIView):
    """GET: all student engagement profiles for a course (instructor/admin)."""

    permission_classes = [IsInstructorOrAdmin]

    def get(self, request, slug):
        course = Course.objects.get(slug=slug)
        enrollments = Enrollment.objects.filter(
            course=course,
        ).select_related('student')

        profiles = []
        for enrollment in enrollments:
            profile = compute_engagement_profile(enrollment.student, course)
            profiles.append(profile)

        serializer = EngagementProfileSerializer(profiles, many=True)
        return Response(serializer.data)
