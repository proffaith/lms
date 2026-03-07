from django.db.models import Count
from rest_framework import serializers

from apps.accounts.serializers import UserMinimalSerializer

from .models import (
    EngagementProfile,
    FeedBookmark,
    FeedItem,
    FeedReaction,
    FeedResponse,
)


# ── FeedItem ──────────────────────────────────────────────


class FeedItemListSerializer(serializers.ModelSerializer):
    author = UserMinimalSerializer(read_only=True)
    response_count = serializers.SerializerMethodField()
    reaction_counts = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    my_reactions = serializers.SerializerMethodField()
    related_item_title = serializers.CharField(
        source='related_item.title', read_only=True, default=None,
    )
    course_objective_code = serializers.CharField(
        source='course_objective.code', read_only=True, default=None,
    )

    class Meta:
        model = FeedItem
        fields = [
            'id', 'course', 'author', 'item_type', 'title', 'summary',
            'source_url', 'course_objective', 'course_objective_code',
            'related_item', 'related_item_title',
            'is_pinned', 'is_featured',
            'response_count', 'reaction_counts', 'is_bookmarked', 'my_reactions',
            'created_at',
        ]

    def get_response_count(self, obj):
        return obj.responses.count()

    def get_reaction_counts(self, obj):
        qs = FeedReaction.objects.filter(
            target_type='item', target_id=obj.id,
        ).values('reaction_type').annotate(count=Count('id'))
        return {r['reaction_type']: r['count'] for r in qs}

    def get_is_bookmarked(self, obj):
        user = self.context.get('request')
        if user:
            user = user.user
        if not user or user.is_anonymous:
            return False
        return obj.bookmarks.filter(user=user).exists()

    def get_my_reactions(self, obj):
        user = self.context.get('request')
        if user:
            user = user.user
        if not user or user.is_anonymous:
            return []
        return list(
            FeedReaction.objects.filter(
                author=user, target_type='item', target_id=obj.id,
            ).values_list('reaction_type', flat=True)
        )


class FeedItemDetailSerializer(FeedItemListSerializer):
    """Extends list serializer with full body and metadata."""

    class Meta(FeedItemListSerializer.Meta):
        fields = FeedItemListSerializer.Meta.fields + [
            'body_html', 'source_metadata', 'engagement_score', 'updated_at',
        ]


class FeedItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedItem
        fields = [
            'item_type', 'title', 'summary', 'body_html',
            'source_url', 'source_metadata', 'course_objective',
            'related_item', 'is_pinned', 'is_featured',
        ]

    def validate(self, attrs):
        user = self.context['request'].user
        item_type = attrs.get('item_type')

        # Students can only create 'student' type
        if user.role == 'student' and item_type != FeedItem.ItemType.STUDENT:
            raise serializers.ValidationError(
                {'item_type': 'Students can only create student-type posts.'}
            )

        # Only instructors/admins can pin or feature
        if user.role == 'student':
            attrs['is_pinned'] = False
            attrs['is_featured'] = False

        return attrs


# ── FeedResponse ──────────────────────────────────────────


class FeedResponseSerializer(serializers.ModelSerializer):
    author = UserMinimalSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    reaction_counts = serializers.SerializerMethodField()
    my_reactions = serializers.SerializerMethodField()

    class Meta:
        model = FeedResponse
        fields = [
            'id', 'feed_item', 'author', 'parent', 'body_text',
            'highlighted_text', 'replies', 'reaction_counts', 'my_reactions',
            'created_at', 'updated_at',
        ]

    def get_replies(self, obj):
        # Only nest replies for top-level responses to avoid infinite recursion.
        if obj.parent is not None:
            return []
        replies = obj.replies.select_related('author').all()
        return FeedResponseSerializer(
            replies, many=True, context=self.context,
        ).data

    def get_reaction_counts(self, obj):
        qs = FeedReaction.objects.filter(
            target_type='response', target_id=obj.id,
        ).values('reaction_type').annotate(count=Count('id'))
        return {r['reaction_type']: r['count'] for r in qs}

    def get_my_reactions(self, obj):
        user = self.context.get('request')
        if user:
            user = user.user
        if not user or user.is_anonymous:
            return []
        return list(
            FeedReaction.objects.filter(
                author=user, target_type='response', target_id=obj.id,
            ).values_list('reaction_type', flat=True)
        )


class FeedResponseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedResponse
        fields = ['body_text', 'highlighted_text', 'parent']


# ── FeedReaction ──────────────────────────────────────────


class FeedReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedReaction
        fields = ['id', 'reaction_type', 'target_type', 'target_id', 'created_at']
        read_only_fields = ['id', 'created_at']


# ── FeedBookmark ──────────────────────────────────────────


class FeedBookmarkSerializer(serializers.ModelSerializer):
    feed_item_title = serializers.CharField(
        source='feed_item.title', read_only=True,
    )

    class Meta:
        model = FeedBookmark
        fields = ['id', 'feed_item', 'feed_item_title', 'note', 'created_at']
        read_only_fields = ['id', 'created_at']


class FeedBookmarkCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedBookmark
        fields = ['feed_item', 'note']


# ── EngagementProfile ────────────────────────────────────


class EngagementProfileSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = EngagementProfile
        fields = [
            'id', 'user', 'course',
            'total_responses', 'total_reactions', 'total_contributions',
            'active_days_count', 'current_streak',
            'depth_score', 'peer_interaction_score',
            'last_activity_at', 'computed_grade', 'updated_at',
        ]
