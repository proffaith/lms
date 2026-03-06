import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, BookOpen, Award } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { CourseProgress } from '@/types'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [progress, setProgress] = useState<CourseProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/dashboard/progress/')
        .then((res) => setProgress(res.data))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  if (!user) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome back, {user.first_name || user.username}!
      </h1>

      {user.role === 'student' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            My Enrolled Courses
          </h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : progress.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet.</p>
              <Link
                to="/courses"
                className="text-blue-600 hover:underline font-medium"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.map((p) => (
                <Link
                  key={p.course_id}
                  to={`/courses/${p.course_slug}`}
                  className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{p.course_title}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <span>{p.completed_lessons} / {p.total_lessons} lessons</span>
                    <span className="font-medium">{p.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${p.progress_percentage}%` }}
                    />
                  </div>
                  {p.progress_percentage === 100 && (
                    <div className="mt-2 flex items-center gap-1 text-green-600 text-sm">
                      <Award className="w-4 h-4" />
                      Completed
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {user.role === 'instructor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/instructor/courses"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <BookOpen className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900">My Courses</h3>
            <p className="text-sm text-gray-500 mt-1">Manage your courses and content</p>
          </Link>
          <Link
            to="/instructor/submissions"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <BarChart3 className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Submissions</h3>
            <p className="text-sm text-gray-500 mt-1">Review and grade student work</p>
          </Link>
        </div>
      )}

      {user.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/users"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">Manage Users</h3>
            <p className="text-sm text-gray-500 mt-1">View and manage user accounts</p>
          </Link>
          <Link
            to="/admin/courses"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">Manage Courses</h3>
            <p className="text-sm text-gray-500 mt-1">Oversee all courses on the platform</p>
          </Link>
          <Link
            to="/programs"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">Programs</h3>
            <p className="text-sm text-gray-500 mt-1">Manage programs and curriculum alignment</p>
          </Link>
        </div>
      )}
    </div>
  )
}
