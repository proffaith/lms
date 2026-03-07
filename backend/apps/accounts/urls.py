from django.urls import path

from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('token/refresh/', views.TokenRefreshApiView.as_view(), name='token-refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('me/', views.MeView.as_view(), name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('forgot-password/', views.PasswordResetRequestView.as_view(), name='forgot-password'),
    path('reset-password/', views.PasswordResetConfirmView.as_view(), name='reset-password'),
    # Admin endpoints
    path('admin/users/', views.AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/stats/', views.AdminStatsView.as_view(), name='admin-stats'),
]
