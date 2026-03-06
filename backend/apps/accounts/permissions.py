from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsInstructor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'instructor'


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'


class IsInstructorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ('instructor', 'admin')
        )


class IsCourseOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        course = _get_course(obj)
        return course.instructor == request.user


class IsEnrolledStudent(BasePermission):
    def has_object_permission(self, request, view, obj):
        course = _get_course(obj)
        return course.enrollments.filter(student=request.user).exists()


def _get_course(obj):
    """Walk up the model hierarchy to find the Course."""
    if hasattr(obj, 'instructor'):  # It's a Course
        return obj
    if hasattr(obj, 'course'):  # Module, Enrollment
        return obj.course
    if hasattr(obj, 'module'):  # Lesson
        return obj.module.course
    if hasattr(obj, 'lesson'):  # LessonContent, Quiz, Assignment
        return obj.lesson.module.course
    return obj
