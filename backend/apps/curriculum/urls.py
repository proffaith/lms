from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('programs', views.ProgramViewSet, basename='program')

urlpatterns = [
    path('', include(router.urls)),
    # Program objectives
    path(
        'programs/<int:program_pk>/objectives/',
        views.ProgramObjectiveViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='program-objectives',
    ),
    path(
        'program-objectives/<int:pk>/',
        views.ProgramObjectiveViewSet.as_view({
            'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
        }),
        name='program-objective-detail',
    ),
    # Course objectives
    path(
        'courses/<slug:course_slug>/objectives/',
        views.CourseObjectiveViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='course-objectives',
    ),
    path(
        'objectives/<int:pk>/',
        views.CourseObjectiveViewSet.as_view({
            'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
        }),
        name='objective-detail',
    ),
    # Alignment
    path(
        'objectives/<int:pk>/align/',
        views.ObjectiveAlignView.as_view(),
        name='objective-align',
    ),
]
