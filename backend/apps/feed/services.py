from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from .models import (
    EngagementProfile,
    FeedItem,
    FeedReaction,
    FeedResponse,
)


def get_ranked_feed(course, user, page_size=20, offset=0):
    """
    Return feed items for a course in weighted-ranked order.

    Scoring formula (v1 — simple, tunable):
      - Recency:           50pts (<24h), 30pts (<72h), 15pts (<7d), 5pts (older)
      - Response velocity:  3pts per response (capped at 30)
      - Pinned:            +100
      - Featured:          +40
      - Unseen by user:    +10

    Computed in Python because course feeds are hundreds of items (not millions),
    and this keeps the formula easy to adjust without complex SQL.
    """
    now = timezone.now()

    items = (
        FeedItem.objects.filter(course=course)
        .select_related('author', 'course_objective', 'related_item')
        .prefetch_related('responses', 'bookmarks')
        .annotate(response_count=Count('responses'))
    )

    # Pre-fetch which items this user has interacted with (for unseen bonus)
    responded_item_ids = set(
        FeedResponse.objects.filter(
            author=user, feed_item__course=course,
        ).values_list('feed_item_id', flat=True)
    )
    reacted_item_ids = set(
        FeedReaction.objects.filter(
            author=user, target_type='item',
        ).values_list('target_id', flat=True)
    )
    interacted_ids = responded_item_ids | reacted_item_ids

    scored = []
    for item in items:
        score = 0.0

        # Recency
        age_hours = (now - item.created_at).total_seconds() / 3600
        if age_hours < 24:
            score += 50
        elif age_hours < 72:
            score += 30
        elif age_hours < 168:
            score += 15
        else:
            score += 5

        # Response velocity
        score += min(item.response_count * 3, 30)

        # Pinned / featured
        if item.is_pinned:
            score += 100
        if item.is_featured:
            score += 40

        # Unseen bonus
        if item.id not in interacted_ids:
            score += 10

        scored.append((score, item))

    # Sort by score desc, then by created_at desc for ties
    scored.sort(key=lambda x: (-x[0], -x[1].created_at.timestamp()))

    return [item for _, item in scored[offset:offset + page_size]]


def compute_engagement_profile(user, course):
    """
    Compute and cache the EngagementProfile for a student in a course.

    Called at read-time, following the same pattern as progress tracking
    (see progress/services.py:get_course_progress).

    Composite grade breakdown (0-100):
      - Response quantity:     max 25 pts (caps at 30 responses)
      - Contributions:         max 20 pts (caps at 10 contributions)
      - Annotation depth:      max 20 pts (fraction with highlighted_text)
      - Peer interaction:      max 15 pts (fraction responding to peers)
      - Consistency:           max 10 pts (caps at 20 active days)
      - Streak:                max 10 pts (caps at 7 day streak)
    """
    responses = FeedResponse.objects.filter(
        author=user,
        feed_item__course=course,
    )

    # Reactions scoped to this course's items and responses
    course_item_ids = FeedItem.objects.filter(course=course).values('id')
    course_response_ids = FeedResponse.objects.filter(
        feed_item__course=course,
    ).values('id')

    reactions = FeedReaction.objects.filter(author=user).filter(
        Q(target_type='item', target_id__in=course_item_ids)
        | Q(target_type='response', target_id__in=course_response_ids)
    )

    contributions = FeedItem.objects.filter(
        course=course,
        author=user,
        item_type=FeedItem.ItemType.STUDENT,
    )

    total_responses = responses.count()
    total_reactions = reactions.count()
    total_contributions = contributions.count()

    # Active days: distinct dates across all activity types
    response_dates = set(responses.values_list('created_at__date', flat=True))
    reaction_dates = set(reactions.values_list('created_at__date', flat=True))
    contribution_dates = set(contributions.values_list('created_at__date', flat=True))
    all_dates = sorted(response_dates | reaction_dates | contribution_dates)
    active_days_count = len(all_dates)

    # Current streak (consecutive days up to today)
    current_streak = 0
    if all_dates:
        today = timezone.now().date()
        streak_date = today
        for d in reversed(all_dates):
            if d == streak_date or d == streak_date - timedelta(days=1):
                current_streak += 1
                streak_date = d
            else:
                break

    # Depth score: fraction of responses that include an annotation
    annotated_count = responses.exclude(highlighted_text='').count()
    depth_score = (annotated_count / total_responses) if total_responses > 0 else 0.0

    # Peer interaction: responses to other students' posts
    peer_responses = responses.filter(
        feed_item__item_type=FeedItem.ItemType.STUDENT,
    ).exclude(feed_item__author=user).count()
    peer_interaction_score = (
        (peer_responses / total_responses) if total_responses > 0 else 0.0
    )

    # Last activity
    last_activity = None
    if all_dates:
        last_activity = timezone.datetime.combine(
            all_dates[-1],
            timezone.datetime.min.time(),
            tzinfo=timezone.utc,
        )

    # Composite grade
    grade = min(100.0, (
        (min(total_responses, 30) / 30) * 25
        + (min(total_contributions, 10) / 10) * 20
        + depth_score * 20
        + peer_interaction_score * 15
        + (min(active_days_count, 20) / 20) * 10
        + (min(current_streak, 7) / 7) * 10
    ))

    profile, _ = EngagementProfile.objects.update_or_create(
        user=user,
        course=course,
        defaults={
            'total_responses': total_responses,
            'total_reactions': total_reactions,
            'total_contributions': total_contributions,
            'active_days_count': active_days_count,
            'current_streak': current_streak,
            'depth_score': round(depth_score, 3),
            'peer_interaction_score': round(peer_interaction_score, 3),
            'last_activity_at': last_activity,
            'computed_grade': round(grade, 1),
        },
    )
    return profile
