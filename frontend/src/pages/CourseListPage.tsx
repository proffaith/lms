import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users } from 'lucide-react'
import api from '@/lib/api'
import type { Course, PaginatedResponse } from '@/types'

export default function CourseListPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<PaginatedResponse<Course>>('/courses/')
      .then((res) => setCourses(res.data.results))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">Loading courses...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No courses available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.slug}`}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-white/50" />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {course.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{course.instructor_name}</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {course.enrollment_count}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
