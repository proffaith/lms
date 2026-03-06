import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Edit, Plus, Users } from 'lucide-react'
import { clsx } from 'clsx'
import api from '@/lib/api'
import type { Course, PaginatedResponse } from '@/types'

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<PaginatedResponse<Course>>('/courses/')
      .then((res) => setCourses(res.data.results))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">Loading your courses...</p>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <Link
          to="/instructor/courses/new"
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" /> New Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">You haven't created any courses yet.</p>
          <Link
            to="/instructor/courses/new"
            className="text-blue-600 hover:underline font-medium"
          >
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
              <div className="flex-1">
                <Link
                  to={`/courses/${course.slug}`}
                  className="font-medium text-gray-900 hover:text-blue-600"
                >
                  {course.title}
                </Link>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className={clsx(
                    'px-2 py-0.5 rounded font-medium',
                    course.status === 'published' ? 'bg-green-100 text-green-700' :
                    course.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600',
                  )}>
                    {course.status}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {course.enrollment_count} enrolled
                  </span>
                </div>
              </div>
              <Link
                to={`/instructor/courses/${course.slug}/edit`}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
              >
                <Edit className="w-4 h-4" /> Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
