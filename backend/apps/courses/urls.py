from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('courses', views.CourseViewSet, basename='course')

urlpatterns = [
    # Import must come before router to avoid slug match
    path('courses/import/', views.CourseImportView.as_view(), name='course-import'),
    path('enrollment-token/validate/', views.EnrollmentTokenValidateView.as_view(), name='enrollment-token-validate'),
    path('', include(router.urls)),
    path('enrollments/', views.EnrollmentListView.as_view(), name='enrollment-list'),
    # Modules under a course
    path(
        'courses/<slug:course_slug>/modules/',
        views.ModuleViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='course-modules',
    ),
    path(
        'modules/<int:pk>/',
        views.ModuleViewSet.as_view({
            'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
        }),
        name='module-detail',
    ),
    # Lessons under a module
    path(
        'modules/<int:module_pk>/lessons/',
        views.LessonViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='module-lessons',
    ),
    path(
        'lessons/<int:pk>/',
        views.LessonViewSet.as_view({
            'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
        }),
        name='lesson-detail',
    ),
    # Content under a lesson
    path(
        'lessons/<int:lesson_pk>/contents/',
        views.LessonContentViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='lesson-contents',
    ),
    path(
        'contents/<int:pk>/',
        views.LessonContentViewSet.as_view({
            'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
        }),
        name='content-detail',
    ),
]
