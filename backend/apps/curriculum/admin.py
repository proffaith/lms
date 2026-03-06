from django.contrib import admin

from .models import CourseObjective, ObjectiveAlignment, Program, ProgramObjective


class ProgramObjectiveInline(admin.TabularInline):
    model = ProgramObjective
    extra = 0


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['title']
    inlines = [ProgramObjectiveInline]


@admin.register(ProgramObjective)
class ProgramObjectiveAdmin(admin.ModelAdmin):
    list_display = ['code', 'program', 'description', 'order']
    list_filter = ['program']


class AlignmentInline(admin.TabularInline):
    model = ObjectiveAlignment
    extra = 0


@admin.register(CourseObjective)
class CourseObjectiveAdmin(admin.ModelAdmin):
    list_display = ['code', 'course', 'description', 'order']
    list_filter = ['course']
    inlines = [AlignmentInline]


@admin.register(ObjectiveAlignment)
class ObjectiveAlignmentAdmin(admin.ModelAdmin):
    list_display = ['course_objective', 'program_objective']
