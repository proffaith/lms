from django.conf import settings
from django.db import models


class FeedItem(models.Model):
    """A single item in the course content stream."""

    class ItemType(models.TextChoices):
        RESEARCH = 'research', 'Research'
        INSTRUCTOR = 'instructor', 'Instructor'
        STUDENT = 'student', 'Student'
        MILESTONE = 'milestone', 'Milestone'

    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='feed_items',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feed_items',
    )
    item_type = models.CharField(
        max_length=20,
        choices=ItemType.choices,
    )
    title = models.CharField(max_length=500)
    summary = models.CharField(max_length=1000, blank=True)
    body_html = models.TextField(blank=True)
    source_url = models.URLField(max_length=2000, blank=True)
    source_metadata = models.JSONField(default=dict, blank=True)
    course_objective = models.ForeignKey(
        'curriculum.CourseObjective',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feed_items',
    )
    related_item = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referencing_items',
    )
    is_pinned = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    engagement_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['course', '-created_at']),
            models.Index(fields=['course', 'item_type']),
        ]

    def __str__(self):
        return f'[{self.item_type}] {self.title[:80]}'


class FeedResponse(models.Model):
    """A threaded comment or annotation on a feed item."""

    feed_item = models.ForeignKey(
        FeedItem,
        on_delete=models.CASCADE,
        related_name='responses',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feed_responses',
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
    )
    body_text = models.TextField()
    highlighted_text = models.TextField(
        blank=True,
        help_text='The specific passage from the feed item the student is responding to.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.author} on {self.feed_item.title[:40]}'


class FeedReaction(models.Model):
    """
    A semantic reaction on a feed item or response.

    Uses target_type + target_id instead of Django GenericForeignKey
    because only two target types exist and it keeps things simple.
    """

    class ReactionType(models.TextChoices):
        INTERESTING = 'interesting', 'Interesting'
        DISAGREE = 'disagree', 'Disagree'
        CONNECTS = 'connects', 'Connects'
        QUESTION = 'question', 'Question'

    class TargetType(models.TextChoices):
        ITEM = 'item', 'Item'
        RESPONSE = 'response', 'Response'

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feed_reactions',
    )
    reaction_type = models.CharField(
        max_length=20,
        choices=ReactionType.choices,
    )
    target_type = models.CharField(
        max_length=20,
        choices=TargetType.choices,
    )
    target_id = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['author', 'target_type', 'target_id', 'reaction_type']
        indexes = [
            models.Index(fields=['target_type', 'target_id']),
        ]

    def __str__(self):
        return f'{self.author} -> {self.reaction_type} on {self.target_type}#{self.target_id}'


class FeedBookmark(models.Model):
    """A personal bookmark on a feed item with an optional note."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feed_bookmarks',
    )
    feed_item = models.ForeignKey(
        FeedItem,
        on_delete=models.CASCADE,
        related_name='bookmarks',
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'feed_item']

    def __str__(self):
        return f'{self.user} bookmarked {self.feed_item.title[:40]}'


class EngagementProfile(models.Model):
    """
    Cached engagement metrics for a student in a course.

    Computed at read-time by services.compute_engagement_profile(),
    following the same pattern as progress tracking.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='engagement_profiles',
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='engagement_profiles',
    )
    total_responses = models.PositiveIntegerField(default=0)
    total_reactions = models.PositiveIntegerField(default=0)
    total_contributions = models.PositiveIntegerField(default=0)
    active_days_count = models.PositiveIntegerField(default=0)
    current_streak = models.PositiveIntegerField(default=0)
    depth_score = models.FloatField(default=0.0)
    peer_interaction_score = models.FloatField(default=0.0)
    last_activity_at = models.DateTimeField(null=True, blank=True)
    computed_grade = models.FloatField(default=0.0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'course']

    def __str__(self):
        return f'{self.user} engagement in {self.course.title[:40]}'


class ResearchPipelineConfig(models.Model):
    """Per-course configuration for the automated research content pipeline."""

    class RunFrequency(models.TextChoices):
        DAILY = 'daily', 'Daily'
        WEEKLY = 'weekly', 'Weekly'

    course = models.OneToOneField(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='research_pipeline_config',
    )
    is_active = models.BooleanField(default=False)
    run_frequency = models.CharField(
        max_length=20,
        choices=RunFrequency.choices,
        default=RunFrequency.WEEKLY,
    )
    search_domains = models.JSONField(default=list, blank=True)
    content_filters = models.JSONField(default=dict, blank=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Pipeline for {self.course.title[:40]}'
