from django.db import models


class Program(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        ARCHIVED = 'archived', 'Archived'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


class ProgramObjective(models.Model):
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name='objectives',
    )
    code = models.CharField(max_length=20, help_text='e.g., PLO-1')
    description = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['program', 'code']

    def __str__(self):
        return f"{self.code}: {self.description[:50]}"


class CourseObjective(models.Model):
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='objectives',
    )
    code = models.CharField(max_length=20, help_text='e.g., CLO-1')
    description = models.TextField()
    order = models.PositiveIntegerField(default=0)
    program_objectives = models.ManyToManyField(
        ProgramObjective,
        blank=True,
        related_name='course_objectives',
        through='ObjectiveAlignment',
    )

    class Meta:
        ordering = ['order']
        unique_together = ['course', 'code']

    def __str__(self):
        return f"{self.code}: {self.description[:50]}"


class ObjectiveAlignment(models.Model):
    course_objective = models.ForeignKey(
        CourseObjective,
        on_delete=models.CASCADE,
    )
    program_objective = models.ForeignKey(
        ProgramObjective,
        on_delete=models.CASCADE,
    )

    class Meta:
        unique_together = ['course_objective', 'program_objective']

    def __str__(self):
        return f"{self.course_objective.code} -> {self.program_objective.code}"
