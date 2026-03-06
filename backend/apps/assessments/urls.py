from django.urls import path

from . import views

urlpatterns = [
    # Quizzes under a lesson
    path(
        'lessons/<int:lesson_pk>/quizzes/',
        views.QuizViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='lesson-quizzes',
    ),
    path(
        'quizzes/<int:pk>/',
        views.QuizViewSet.as_view({
            'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
        }),
        name='quiz-detail',
    ),
    # Questions under a quiz
    path(
        'quizzes/<int:quiz_pk>/questions/',
        views.QuestionViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='quiz-questions',
    ),
    path(
        'questions/<int:pk>/',
        views.QuestionViewSet.as_view({
            'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
        }),
        name='question-detail',
    ),
    # Quiz taking (student)
    path('quizzes/<int:pk>/take/', views.QuizTakeView.as_view(), name='quiz-take'),
    path('quizzes/<int:pk>/submit/', views.QuizSubmitView.as_view(), name='quiz-submit'),
    path('quizzes/<int:pk>/attempts/', views.QuizAttemptsView.as_view(), name='quiz-attempts'),
    # Assignments under a lesson
    path(
        'lessons/<int:lesson_pk>/assignments/',
        views.AssignmentViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='lesson-assignments',
    ),
    path(
        'assignments/<int:pk>/',
        views.AssignmentViewSet.as_view({
            'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
        }),
        name='assignment-detail',
    ),
    # Submissions
    path('assignments/<int:pk>/submit/', views.SubmissionCreateView.as_view(), name='assignment-submit'),
    path('assignments/<int:pk>/submissions/', views.SubmissionListView.as_view(), name='assignment-submissions'),
    path('submissions/<int:pk>/', views.SubmissionDetailView.as_view(), name='submission-detail'),
    path('submissions/<int:pk>/grade/', views.GradeSubmissionView.as_view(), name='submission-grade'),
]
