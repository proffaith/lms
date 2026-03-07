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
import ProgressPage from '@/pages/ProgressPage'
import CertificatesPage from '@/pages/CertificatesPage'
import CertificateViewPage from '@/pages/CertificateViewPage'
import ProgramsPage from '@/pages/ProgramsPage'
import CourseBuilderPage from '@/pages/instructor/CourseBuilderPage'
import InstructorCoursesPage from '@/pages/instructor/InstructorCoursesPage'
import QuizBuilderPage from '@/pages/instructor/QuizBuilderPage'
import SubmissionsPage from '@/pages/instructor/SubmissionsPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminCoursesPage from '@/pages/admin/AdminCoursesPage'
import ImportCoursePage from '@/pages/admin/ImportCoursePage'
import FeedPage from '@/pages/FeedPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password/:uid/:token', element: <ResetPasswordPage /> },

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
      { path: 'courses/:slug/feed', element: <FeedPage /> },
      { path: 'quizzes/:quizId', element: <QuizPage /> },
      { path: 'assignments/:assignmentId', element: <AssignmentPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'my-certificates', element: <CertificatesPage /> },
      { path: 'certificates/:uuid', element: <CertificateViewPage /> },
      { path: 'programs', element: <ProgramsPage /> },
      // Instructor routes
      { path: 'instructor/courses', element: <InstructorCoursesPage /> },
      { path: 'instructor/courses/new', element: <CourseBuilderPage /> },
      { path: 'instructor/courses/:slug/edit', element: <CourseBuilderPage /> },
      { path: 'instructor/lessons/:lessonId/quizzes/new', element: <QuizBuilderPage /> },
      { path: 'instructor/quizzes/:quizId/edit', element: <QuizBuilderPage /> },
      { path: 'instructor/submissions', element: <SubmissionsPage /> },
      // Admin routes
      { path: 'admin/users', element: <AdminUsersPage /> },
      { path: 'admin/courses', element: <AdminCoursesPage /> },
      { path: 'admin/import', element: <ImportCoursePage /> },
    ],
  },
])
