import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  Target,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { CourseDetail, CourseObjective, LessonProgressDetail } from '@/types'

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const user = useAuthStore((s) => s.user)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [objectives, setObjectives] = useState<CourseObjective[]>([])
  const [progress, setProgress] = useState<{ lessons: LessonProgressDetail[]; progress_percentage: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!slug) return
    Promise.all([
      api.get<CourseDetail>(`/courses/${slug}/`),
      api.get<CourseObjective[]>(`/courses/${slug}/objectives/`).catch(() => ({ data: [] })),
    ]).then(([courseRes, objRes]) => {
      setCourse(courseRes.data)
      setObjectives(Array.isArray(objRes.data) ? objRes.data : (objRes.data as any).results || [])
      // Expand all modules by default
      setExpandedModules(new Set(courseRes.data.modules.map((m) => m.id)))
      // Fetch progress if enrolled
      if (courseRes.data.is_enrolled) {
        api.get(`/courses/${slug}/progress/`).then((res) => setProgress(res.data))
      }
    }).finally(() => setLoading(false))
  }, [slug])

  const handleEnroll = async () => {
    if (!slug) return
    setEnrolling(true)
    try {
      await api.post(`/courses/${slug}/enroll/`)
      toast.success('Enrolled successfully!')
      // Refresh course data
      const res = await api.get<CourseDetail>(`/courses/${slug}/`)
      setCourse(res.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to enroll.')
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenroll = async () => {
    if (!slug) return
    try {
      await api.delete(`/courses/${slug}/unenroll/`)
      toast.success('Unenrolled.')
      const res = await api.get<CourseDetail>(`/courses/${slug}/`)
      setCourse(res.data)
      setProgress(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to unenroll.')
    }
  }

  const toggleModule = (id: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isLessonCompleted = (lessonId: number) => {
    return progress?.lessons.some((l) => l.lesson_id === lessonId && l.completed) ?? false
  }

  if (loading) return <p className="text-gray-500">Loading course...</p>
  if (!course) return <p className="text-red-500">Course not found.</p>

  const isOwner = user?.role === 'instructor' && course.instructor.id === user.id
  const isAdmin = user?.role === 'admin'
  const canEdit = isOwner || isAdmin

  return (
    <div className="max-w-4xl">
      {/* Course Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-gray-600 mb-4">{course.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>By {course.instructor.full_name}</span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {course.enrollment_count} enrolled
              </span>
              <span className={clsx(
                'px-2 py-0.5 rounded text-xs font-medium',
                course.status === 'published' ? 'bg-green-100 text-green-700' :
                course.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              )}>
                {course.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {canEdit && (
              <Link
                to={`/instructor/courses/${slug}/edit`}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm text-center"
              >
                Edit Course
              </Link>
            )}
            {user?.role === 'student' && !course.is_enrolled && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {enrolling ? 'Enrolling...' : 'Enroll Now'}
              </button>
            )}
            {user?.role === 'student' && course.is_enrolled && (
              <button
                onClick={handleUnenroll}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-sm"
              >
                Unenroll
              </button>
            )}
            {(course.is_enrolled || canEdit) && (
              <Link
                to={`/courses/${slug}/feed`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                Course Feed
              </Link>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {course.is_enrolled && progress && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Your Progress</span>
              <span className="font-medium text-gray-900">{progress.progress_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all"
                style={{ width: `${progress.progress_percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Learning Objectives */}
      {objectives.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Learning Objectives
          </h2>
          <ul className="space-y-2">
            {objectives.map((obj) => (
              <li key={obj.id} className="flex items-start gap-3">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono font-medium mt-0.5">
                  {obj.code}
                </span>
                <span className="text-gray-700 text-sm">{obj.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Course Content (Modules & Lessons) */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Course Content
        </h2>

        {course.modules.length === 0 ? (
          <p className="text-gray-500 text-sm">No content added yet.</p>
        ) : (
          <div className="space-y-2">
            {course.modules.map((mod) => (
              <div key={mod.id} className="border rounded-lg">
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {expandedModules.has(mod.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">{mod.title}</span>
                    <span className="text-xs text-gray-400">
                      {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
                    </span>
                    {mod.quiz_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        <FileQuestion className="w-3 h-3" />
                        {mod.quiz_count} quiz{mod.quiz_count !== 1 ? 'zes' : ''}
                      </span>
                    )}
                    {mod.assignment_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        <ClipboardList className="w-3 h-3" />
                        {mod.assignment_count} assignment{mod.assignment_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>

                {expandedModules.has(mod.id) && mod.lessons.length > 0 && (
                  <div className="border-t">
                    {mod.lessons.map((lesson) => {
                      const completed = isLessonCompleted(lesson.id)
                      const canAccess = course.is_enrolled || canEdit
                      return (
                        <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 pl-10 hover:bg-gray-50">
                          {completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                          )}
                          {canAccess ? (
                            <Link
                              to={`/courses/${slug}/learn/${lesson.id}`}
                              className="text-sm text-blue-600 hover:underline flex-1"
                            >
                              {lesson.title}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-500 flex-1">{lesson.title}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
