import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  BookOpen,
  Edit,
  ExternalLink,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { Course, PaginatedResponse } from '@/types'

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)

  useEffect(() => {
    api.get<PaginatedResponse<Course>>('/courses/')
      .then((res) => setCourses(res.data.results))
      .finally(() => setLoading(false))
  }, [])

  const filteredCourses = courses.filter((c) => {
    const matchSearch =
      !search || c.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const statusColors: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-600',
  }

  const handleStatusChange = async (course: Course, newStatus: string) => {
    setActionLoading(course.slug)
    try {
      await api.post(`/courses/${course.slug}/change-status/`, { status: newStatus })
      setCourses((prev) =>
        prev.map((c) =>
          c.slug === course.slug ? { ...c, status: newStatus as Course['status'] } : c,
        ),
      )
      toast.success(`"${course.title}" is now ${newStatus}.`)
    } catch {
      toast.error('Failed to change status.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async (course: Course) => {
    setActionLoading(course.slug)
    try {
      await api.post(`/courses/${course.slug}/archive/`)
      setCourses((prev) =>
        prev.map((c) =>
          c.slug === course.slug ? { ...c, status: 'archived' as Course['status'] } : c,
        ),
      )
      toast.success(`"${course.title}" archived.`)
    } catch {
      toast.error('Failed to archive course.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (course: Course) => {
    setActionLoading(course.slug)
    try {
      await api.delete(`/courses/${course.slug}/`)
      setCourses((prev) => prev.filter((c) => c.slug !== course.slug))
      toast.success(`"${course.title}" deleted.`)
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete course.')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <p className="text-gray-500">Loading courses...</p>

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <BookOpen className="w-6 h-6" />
        Manage Courses
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-xl font-bold text-gray-900">{courses.length}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-xl font-bold text-green-600">
            {courses.filter((c) => c.status === 'published').length}
          </div>
          <div className="text-xs text-gray-500">Published</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-xl font-bold text-gray-400">
            {courses.filter((c) => c.status === 'archived').length}
          </div>
          <div className="text-xs text-gray-500">Archived</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-xl font-bold text-purple-600">
            {courses.reduce((s, c) => s + c.enrollment_count, 0)}
          </div>
          <div className="text-xs text-gray-500">Total Enrollments</div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">{filteredCourses.length} courses</p>

      {/* Course table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Course</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Instructor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Enrolled</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCourses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/courses/${c.slug}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.instructor_name}</td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded font-medium',
                      statusColors[c.status] || 'bg-gray-100 text-gray-600',
                    )}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Users className="w-3 h-3" />
                      {c.enrollment_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/courses/${c.slug}`}
                        className="text-xs text-gray-600 hover:text-blue-600 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </Link>
                      <Link
                        to={`/instructor/courses/${c.slug}/edit`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </Link>

                      {/* Status toggle */}
                      {c.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(c, 'published')}
                          disabled={actionLoading === c.slug}
                          className="text-xs text-green-600 hover:underline disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}
                      {c.status === 'published' && (
                        <button
                          onClick={() => handleStatusChange(c, 'draft')}
                          disabled={actionLoading === c.slug}
                          className="text-xs text-yellow-600 hover:underline disabled:opacity-50"
                        >
                          Unpublish
                        </button>
                      )}
                      {c.status === 'archived' && (
                        <button
                          onClick={() => handleStatusChange(c, 'draft')}
                          disabled={actionLoading === c.slug}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Restore
                        </button>
                      )}

                      {/* Archive (only for non-archived) */}
                      {c.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(c)}
                          disabled={actionLoading === c.slug}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5 disabled:opacity-50"
                          title="Archive"
                        >
                          <Archive className="w-3 h-3" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(c)}
                        disabled={actionLoading === c.slug}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Course</h3>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
            </p>
            <p className="text-xs text-red-600 mb-4">
              This will permanently remove the course and all its content, including
              modules, lessons, quizzes, assignments, and student submissions.
              This action cannot be undone.
            </p>
            {deleteTarget.enrollment_count > 0 && (
              <p className="text-xs text-amber-600 mb-4 font-medium">
                Warning: {deleteTarget.enrollment_count} student(s) are currently enrolled
                in this course.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={actionLoading === deleteTarget.slug}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === deleteTarget.slug ? 'Deleting...' : 'Delete Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
