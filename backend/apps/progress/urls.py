from django.urls import path

from . import views

urlpatterns = [
    path('lessons/<int:pk>/complete/', views.MarkLessonCompleteView.as_view(), name='lesson-complete'),
    path('courses/<slug:slug>/progress/', views.CourseProgressView.as_view(), name='course-progress'),
    path('dashboard/progress/', views.DashboardProgressView.as_view(), name='dashboard-progress'),
    path('certificates/<uuid:uuid>/', views.CertificateDetailView.as_view(), name='certificate-detail'),
    path('my-certificates/', views.MyCertificatesView.as_view(), name='my-certificates'),
]
