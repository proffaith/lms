import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.permissions import IsAdmin

from .serializers import (
    AdminUserSerializer,
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]


class TokenRefreshApiView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully.'})


class AdminUserListView(generics.ListAPIView):
    """GET: list all users (admin only)."""
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH: view or update a user (admin only)."""
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]


class AdminStatsView(APIView):
    """GET: platform-wide statistics (admin only)."""
    permission_classes = [IsAdmin]

    def get(self, request):
        from apps.courses.models import Course, Enrollment
        from apps.assessments.models import Submission

        return Response({
            'total_users': User.objects.count(),
            'students': User.objects.filter(role='student').count(),
            'instructors': User.objects.filter(role='instructor').count(),
            'admins': User.objects.filter(role='admin').count(),
            'total_courses': Course.objects.count(),
            'published_courses': Course.objects.filter(status='published').count(),
            'total_enrollments': Enrollment.objects.count(),
            'pending_submissions': Submission.objects.filter(status='submitted').count(),
        })


class PasswordResetRequestView(APIView):
    """Request a password reset link. Accepts username or email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['email']

        user = User.objects.filter(
            Q(email__iexact=identifier) | Q(username__iexact=identifier)
        ).first()

        # Always return success to prevent user enumeration
        if user and user.is_active:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"/reset-password/{uid}/{token}"

            # In development, log the link. In production, send email.
            logger.info(
                f"Password reset requested for {user.username}: {reset_url}"
            )

            # TODO: send email in production
            # For now, return the link directly so the frontend can display it
            return Response({
                'detail': 'If an account exists with that username or email, a reset link has been generated.',
                'reset_url': reset_url,
            })

        return Response({
            'detail': 'If an account exists with that username or email, a reset link has been generated.',
        })


class PasswordResetConfirmView(APIView):
    """Confirm password reset with uid, token, and new password."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'detail': 'Invalid reset link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, serializer.validated_data['token']):
            return Response(
                {'detail': 'Reset link has expired or is invalid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Password has been reset successfully.'})
