import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import api from '@/lib/api'
import type { CourseProgress, LessonProgressDetail } from '@/types'

interface CourseDetailedProgress extends CourseProgress {
  lessons?: LessonProgressDetail[]
}

export default function ProgressPage() {
  const [courses, setCourses] = useState<CourseDetailedProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    api.get<CourseProgress[]>('/dashboard/progress/')
      .then((res) => setCourses(res.data))
      .finally(() => setLoading(false))
  }, [])

  const toggleCourse = async (courseId: number, courseSlug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) {
        next.delete(courseId)
      } else {
        next.add(courseId)
        // Fetch lesson-level progress if not already loaded
        const course = courses.find((c) => c.course_id === courseId)
        if (course && !course.lessons) {
          api.get(`/courses/${courseSlug}/progress/`).then((res) => {
            setCourses((prev) =>
              prev.map((c) =>
                c.course_id === courseId ? { ...c, lessons: res.data.lessons } : c,
              ),
            )
          })
        }
      }
      return next
    })
  }

  if (loading) return <p className="text-gray-500">Loading progress...</p>

  const totalCourses = courses.length
  const completedCourses = courses.filter((c) => c.progress_percentage === 100).length
  const totalLessons = courses.reduce((sum, c) => sum + c.total_lessons, 0)
  const completedLessons = courses.reduce((sum, c) => sum + c.completed_lessons, 0)
  const overallPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        My Progress
      </h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalCourses}</div>
          <div className="text-xs text-gray-500">Enrolled Courses</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{completedCourses}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {completedLessons}/{totalLessons}
          </div>
          <div className="text-xs text-gray-500">Lessons Done</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{overallPercentage}%</div>
          <div className="text-xs text-gray-500">Overall</div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet.</p>
          <Link to="/courses" className="text-blue-600 hover:underline font-medium">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.course_id} className="bg-white rounded-lg shadow-sm">
              <button
                onClick={() => toggleCourse(course.course_id, course.course_slug)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{course.course_title}</h3>
                    {course.progress_percentage === 100 && (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded font-medium">
                        <Award className="w-3 h-3" /> Complete
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                    <span>
                      {course.completed_lessons}/{course.total_lessons} lessons
                    </span>
                    <span className="font-medium">{course.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={clsx(
                        'h-2.5 rounded-full transition-all',
                        course.progress_percentage === 100 ? 'bg-green-500' : 'bg-blue-600',
                      )}
                      style={{ width: `${course.progress_percentage}%` }}
                    />
                  </div>
                </div>
                {expanded.has(course.course_id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                )}
              </button>

              {expanded.has(course.course_id) && (
                <div className="border-t px-5 pb-4">
                  {course.lessons ? (
                    <div className="divide-y">
                      {course.lessons.map((lesson) => (
                        <div
                          key={lesson.lesson_id}
                          className="flex items-center gap-3 py-3"
                        >
                          {lesson.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                          )}
                          <div className="flex-1">
                            <Link
                              to={`/courses/${course.course_slug}/learn/${lesson.lesson_id}`}
                              className="text-sm text-gray-900 hover:text-blue-600"
                            >
                              {lesson.lesson_title}
                            </Link>
                            <span className="text-xs text-gray-400 ml-2">
                              {lesson.module_title}
                            </span>
                          </div>
                          {lesson.completed_at && (
                            <span className="text-xs text-gray-400">
                              {new Date(lesson.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm py-3">Loading lessons...</p>
                  )}
                  <Link
                    to={`/courses/${course.course_slug}`}
                    className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                  >
                    Go to course &rarr;
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
