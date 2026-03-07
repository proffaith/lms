from django.contrib import admin

from .models import Course, Enrollment, Lesson, LessonContent, Module


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'program', 'status', 'enrollment_token', 'created_at']
    list_filter = ['status', 'program']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['enrollment_token']
    inlines = [ModuleInline]


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order']
    list_filter = ['course']
    inlines = [LessonInline]


class LessonContentInline(admin.TabularInline):
    model = LessonContent
    extra = 0


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'module', 'order']
    inlines = [LessonContentInline]


@admin.register(LessonContent)
class LessonContentAdmin(admin.ModelAdmin):
    list_display = ['title', 'lesson', 'content_type', 'order']


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'enrolled_at']
    list_filter = ['course']
