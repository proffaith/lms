import { createBrowserRouter } from 'react-router-dom'
import { AuthGuard } from '@/features/auth/components/AuthGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import CourseListPage from '@/pages/CourseListPage'
import CourseDetailPage from '@/pages/CourseDetailPage'
import LessonPage from '@/pages/LessonPage'
import QuizPage from '@/pages/QuizPage'
import AssignmentPage from '@/pages/AssignmentPage'
import ProgramsPage from '@/pages/ProgramsPage'
import CourseBuilderPage from '@/pages/instructor/CourseBuilderPage'
import InstructorCoursesPage from '@/pages/instructor/InstructorCoursesPage'
import QuizBuilderPage from '@/pages/instructor/QuizBuilderPage'
import SubmissionsPage from '@/pages/instructor/SubmissionsPage'

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Protected routes
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'courses', element: <CourseListPage /> },
      { path: 'courses/:slug', element: <CourseDetailPage /> },
      { path: 'courses/:slug/learn/:lessonId', element: <LessonPage /> },
      { path: 'quizzes/:quizId', element: <QuizPage /> },
      { path: 'assignments/:assignmentId', element: <AssignmentPage /> },
      { path: 'progress', element: <div>My Progress (Coming Soon)</div> },
      { path: 'my-certificates', element: <div>My Certificates (Coming Soon)</div> },
      { path: 'programs', element: <ProgramsPage /> },
      // Instructor routes
      { path: 'instructor/courses', element: <InstructorCoursesPage /> },
      { path: 'instructor/courses/new', element: <CourseBuilderPage /> },
      { path: 'instructor/courses/:slug/edit', element: <CourseBuilderPage /> },
      { path: 'instructor/lessons/:lessonId/quizzes/new', element: <QuizBuilderPage /> },
      { path: 'instructor/quizzes/:quizId/edit', element: <QuizBuilderPage /> },
      { path: 'instructor/submissions', element: <SubmissionsPage /> },
      // Admin routes
      { path: 'admin/users', element: <div>Manage Users (Coming Soon)</div> },
      { path: 'admin/courses', element: <div>Manage Courses (Coming Soon)</div> },
    ],
  },
])
