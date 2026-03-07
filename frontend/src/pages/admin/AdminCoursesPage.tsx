import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Edit,
  ExternalLink,
  Search,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import api from '@/lib/api'
import type { Course, PaginatedResponse } from '@/types'

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

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
      <div className="grid grid-cols-3 gap-4 mb-6">
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
                    <div className="flex items-center justify-end gap-3">
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
