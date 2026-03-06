import { createBrowserRouter } from 'react-router-dom'
import { AuthGuard } from '@/features/auth/components/AuthGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import CourseListPage from '@/pages/CourseListPage'

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
      { path: 'courses/:slug', element: <div>Course Detail (Coming Soon)</div> },
      { path: 'courses/:slug/learn/:lessonId', element: <div>Lesson View (Coming Soon)</div> },
      { path: 'progress', element: <div>My Progress (Coming Soon)</div> },
      { path: 'my-certificates', element: <div>My Certificates (Coming Soon)</div> },
      { path: 'programs', element: <div>Programs (Coming Soon)</div> },
      // Instructor routes
      { path: 'instructor/courses', element: <div>Instructor Courses (Coming Soon)</div> },
      { path: 'instructor/courses/new', element: <div>Course Builder (Coming Soon)</div> },
      { path: 'instructor/courses/:slug/edit', element: <div>Edit Course (Coming Soon)</div> },
      { path: 'instructor/submissions', element: <div>Submissions (Coming Soon)</div> },
      // Admin routes
      { path: 'admin/users', element: <div>Manage Users (Coming Soon)</div> },
      { path: 'admin/courses', element: <div>Manage Courses (Coming Soon)</div> },
    ],
  },
])
