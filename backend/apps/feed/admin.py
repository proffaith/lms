from django.contrib import admin

from .models import (
    EngagementProfile,
    FeedBookmark,
    FeedItem,
    FeedReaction,
    FeedResponse,
    ResearchPipelineConfig,
)


class FeedResponseInline(admin.TabularInline):
    model = FeedResponse
    extra = 0
    fields = ['author', 'body_text', 'highlighted_text', 'parent', 'created_at']
    readonly_fields = ['created_at']


@admin.register(FeedItem)
class FeedItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'item_type', 'author', 'is_pinned', 'is_featured', 'created_at']
    list_filter = ['item_type', 'is_pinned', 'is_featured', 'course']
    search_fields = ['title', 'summary', 'body_html']
    inlines = [FeedResponseInline]


@admin.register(FeedResponse)
class FeedResponseAdmin(admin.ModelAdmin):
    list_display = ['author', 'feed_item', 'parent', 'created_at']
    list_filter = ['feed_item__course']
    search_fields = ['body_text']


@admin.register(FeedReaction)
class FeedReactionAdmin(admin.ModelAdmin):
    list_display = ['author', 'reaction_type', 'target_type', 'target_id', 'created_at']
    list_filter = ['reaction_type', 'target_type']


@admin.register(FeedBookmark)
class FeedBookmarkAdmin(admin.ModelAdmin):
    list_display = ['user', 'feed_item', 'created_at']
    list_filter = ['feed_item__course']


@admin.register(EngagementProfile)
class EngagementProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'computed_grade', 'total_responses', 'total_reactions', 'current_streak']
    list_filter = ['course']


@admin.register(ResearchPipelineConfig)
class ResearchPipelineConfigAdmin(admin.ModelAdmin):
    list_display = ['course', 'is_active', 'run_frequency', 'last_run_at', 'next_run_at']
    list_filter = ['is_active', 'run_frequency']
