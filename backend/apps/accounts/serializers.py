from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'role',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError(
                {'password_confirm': 'Passwords do not match.'}
            )
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'bio', 'avatar', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'username', 'role', 'created_at', 'updated_at']


class UserMinimalSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'avatar']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin view — can update role and is_active."""
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'bio', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'username', 'created_at', 'updated_at']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.CharField(help_text='Username or email')


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
