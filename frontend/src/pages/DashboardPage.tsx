import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Target,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Certificate, Course, CourseProgress, PaginatedResponse, PlatformStats } from '@/types'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [progress, setProgress] = useState<CourseProgress[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const promises: Promise<void>[] = []

    if (user.role === 'student') {
      promises.push(
        api.get('/dashboard/progress/').then((res) => setProgress(res.data)),
        api.get('/my-certificates/').then((res) =>
          setCertificates(Array.isArray(res.data) ? res.data : []),
        ),
      )
    }

    if (user.role === 'instructor') {
      promises.push(
        api.get<PaginatedResponse<Course>>('/courses/').then((res) =>
          setCourses(res.data.results),
        ),
      )
    }

    if (user.role === 'admin') {
      promises.push(
        api.get<PlatformStats>('/auth/admin/stats/').then((res) => setStats(res.data)),
      )
    }

    Promise.all(promises).finally(() => setLoading(false))
  }, [user])

  if (!user) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome back, {user.first_name || user.username}!
      </h1>

      {/* ===== STUDENT DASHBOARD ===== */}
      {user.role === 'student' && (
        <div>
          {!loading && progress.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{progress.length}</div>
                <div className="text-xs text-gray-500">Enrolled</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {progress.filter((p) => p.progress_percentage === 100).length}
                </div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {progress.reduce((s, p) => s + p.completed_lessons, 0)}
                </div>
                <div className="text-xs text-gray-500">Lessons Done</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{certificates.length}</div>
                <div className="text-xs text-gray-500">Certificates</div>
              </div>
            </div>
          )}

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
              <Link to="/courses" className="text-blue-600 hover:underline font-medium">
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
                      className={clsx(
                        'h-2 rounded-full transition-all',
                        p.progress_percentage === 100 ? 'bg-green-500' : 'bg-blue-600',
                      )}
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

          {certificates.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Recent Certificates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {certificates.slice(0, 4).map((cert) => (
                  <Link
                    key={cert.id}
                    to={`/certificates/${cert.id}`}
                    className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow border border-yellow-100"
                  >
                    <Award className="w-8 h-8 text-yellow-500 shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{cert.course_title}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== INSTRUCTOR DASHBOARD ===== */}
      {user.role === 'instructor' && (
        <div>
          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{courses.length}</div>
                <div className="text-xs text-gray-500">My Courses</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {courses.filter((c) => c.status === 'published').length}
                </div>
                <div className="text-xs text-gray-500">Published</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {courses.reduce((s, c) => s + c.enrollment_count, 0)}
                </div>
                <div className="text-xs text-gray-500">Total Students</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              to="/instructor/courses"
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <GraduationCap className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900">My Courses</h3>
              <p className="text-sm text-gray-500 mt-1">Manage your courses and content</p>
            </Link>
            <Link
              to="/instructor/submissions"
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <ClipboardList className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900">Submissions</h3>
              <p className="text-sm text-gray-500 mt-1">Review and grade student work</p>
            </Link>
          </div>

          {courses.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Courses</h2>
              <div className="space-y-2">
                {courses.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    to={`/courses/${c.slug}`}
                    className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{c.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded font-medium',
                          c.status === 'published' ? 'bg-green-100 text-green-700' :
                          c.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600',
                        )}>
                          {c.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {c.enrollment_count} students
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ADMIN DASHBOARD ===== */}
      {user.role === 'admin' && (
        <div>
          {stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total_users}</div>
                  <div className="text-xs text-gray-500">Total Users</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.total_courses}</div>
                  <div className="text-xs text-gray-500">Courses</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.total_enrollments}</div>
                  <div className="text-xs text-gray-500">Enrollments</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.pending_submissions}</div>
                  <div className="text-xs text-gray-500">Pending Grading</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">User Breakdown</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{stats.students}</div>
                    <div className="text-xs text-gray-500">Students</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{stats.instructors}</div>
                    <div className="text-xs text-gray-500">Instructors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{stats.admins}</div>
                    <div className="text-xs text-gray-500">Admins</div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/users"
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <Users className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-500 mt-1">View and manage user accounts</p>
            </Link>
            <Link
              to="/admin/courses"
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <BookOpen className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900">Manage Courses</h3>
              <p className="text-sm text-gray-500 mt-1">Oversee all courses on the platform</p>
            </Link>
            <Link
              to="/programs"
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <Target className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900">Programs</h3>
              <p className="text-sm text-gray-500 mt-1">Manage curriculum alignment</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
