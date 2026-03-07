from django.urls import path

from . import views

urlpatterns = [
    # Feed items under a course (list + create)
    path(
        'courses/<slug:course_slug>/feed/',
        views.FeedItemViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='course-feed',
    ),

    # Feed item detail (retrieve, update, delete)
    path(
        'feed-items/<int:pk>/',
        views.FeedItemViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='feed-item-detail',
    ),

    # Feed item actions
    path(
        'feed-items/<int:pk>/pin/',
        views.FeedItemViewSet.as_view({'post': 'pin'}),
        name='feed-item-pin',
    ),
    path(
        'feed-items/<int:pk>/feature/',
        views.FeedItemViewSet.as_view({'post': 'feature'}),
        name='feed-item-feature',
    ),

    # Responses under a feed item (list + create)
    path(
        'feed-items/<int:item_pk>/responses/',
        views.FeedResponseViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='feed-item-responses',
    ),

    # Response detail (retrieve, update, delete)
    path(
        'feed-responses/<int:pk>/',
        views.FeedResponseViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='feed-response-detail',
    ),

    # Reactions (toggle)
    path(
        'feed-reactions/',
        views.FeedReactionToggleView.as_view(),
        name='feed-reaction-toggle',
    ),

    # Bookmarks
    path(
        'courses/<slug:course_slug>/feed/bookmarks/',
        views.FeedBookmarkViewSet.as_view({'get': 'list'}),
        name='course-feed-bookmarks',
    ),
    path(
        'feed-bookmarks/',
        views.FeedBookmarkViewSet.as_view({'post': 'create'}),
        name='feed-bookmark-create',
    ),
    path(
        'feed-bookmarks/<int:pk>/',
        views.FeedBookmarkViewSet.as_view({
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='feed-bookmark-detail',
    ),

    # Engagement
    path(
        'courses/<slug:slug>/engagement/',
        views.MyEngagementView.as_view(),
        name='my-engagement',
    ),
    path(
        'courses/<slug:slug>/engagement/roster/',
        views.EngagementRosterView.as_view(),
        name='engagement-roster',
    ),
]
