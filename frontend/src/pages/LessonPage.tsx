import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Play,
  Type,
} from 'lucide-react'
import { clsx } from 'clsx'
import DOMPurify from 'dompurify'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { CourseDetail, Lesson, LessonContent, Quiz, Assignment } from '@/types'

const HTML_TAG_REGEX = /<[a-z][\s\S]*>/i

function ContentRenderer({ content }: { content: LessonContent }) {
  if (content.content_type === 'text') {
    const isHtml = HTML_TAG_REGEX.test(content.text_content || '')
    return (
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Type className="w-4 h-4" />
          {content.title || 'Text Content'}
        </div>
        {isHtml ? (
          <div
            className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(content.text_content),
            }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 rounded-lg p-4">
            {content.text_content}
          </div>
        )}
      </div>
    )
  }

  if (content.content_type === 'video') {
    const embedUrl = getEmbedUrl(content.video_url)
    return (
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Play className="w-4 h-4" />
          {content.title || 'Video'}
        </div>
        {embedUrl ? (
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={content.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            Watch Video
          </a>
        )}
      </div>
    )
  }

  if (content.content_type === 'file') {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4" />
          {content.title || 'File'}
        </div>
        <a
          href={content.file}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download File
        </a>
      </div>
    )
  }

  return null
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return null
}

export default function LessonPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [completed, setCompleted] = useState(false)
  const [marking, setMarking] = useState(false)
  const [loading, setLoading] = useState(true)

  // Flat list of all lessons in order for prev/next navigation
  const allLessons = course?.modules.flatMap((m) => m.lessons) ?? []
  const currentIndex = allLessons.findIndex((l) => l.id === Number(lessonId))
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  useEffect(() => {
    if (!slug || !lessonId) return
    setLoading(true)
    Promise.all([
      api.get<Lesson>(`/lessons/${lessonId}/`),
      api.get<CourseDetail>(`/courses/${slug}/`),
      api.get(`/lessons/${lessonId}/quizzes/`).catch(() => ({ data: [] })),
      api.get(`/lessons/${lessonId}/assignments/`).catch(() => ({ data: [] })),
    ]).then(([lessonRes, courseRes, quizRes, assignRes]) => {
      setLesson(lessonRes.data)
      setCourse(courseRes.data)
      const qData = quizRes.data
      setQuizzes(Array.isArray(qData) ? qData : qData.results || [])
      const aData = assignRes.data
      setAssignments(Array.isArray(aData) ? aData : aData.results || [])
    }).finally(() => setLoading(false))

    // Check completion status
    api.get(`/courses/${slug}/progress/`).then((res) => {
      const lessonProgress = res.data.lessons?.find(
        (l: any) => l.lesson_id === Number(lessonId),
      )
      setCompleted(lessonProgress?.completed ?? false)
    }).catch(() => {})
  }, [slug, lessonId])

  const markComplete = async () => {
    setMarking(true)
    try {
      const res = await api.post(`/lessons/${lessonId}/complete/`)
      setCompleted(true)
      if (res.data.certificate_id) {
        toast.success(res.data.message || 'You earned a certificate!')
      } else {
        toast.success('Lesson completed!')
      }
    } catch {
      toast.error('Failed to mark as complete.')
    } finally {
      setMarking(false)
    }
  }

  if (loading) return <p className="text-gray-500">Loading lesson...</p>
  if (!lesson || !course) return <p className="text-red-500">Lesson not found.</p>

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to={`/courses/${slug}`} className="hover:text-blue-600">
          {course.title}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-900">{lesson.title}</span>
      </div>

      {/* Lesson Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-gray-600 text-sm">{lesson.description}</p>
            )}
          </div>
          {course.is_enrolled && (
            <button
              onClick={markComplete}
              disabled={completed || marking}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors shrink-0',
                completed
                  ? 'bg-green-50 text-green-700 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50',
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              {completed ? 'Completed' : marking ? 'Marking...' : 'Mark Complete'}
            </button>
          )}
        </div>
      </div>

      {/* Content Blocks */}
      {lesson.contents.length > 0 ? (
        <div className="space-y-6 mb-6">
          {lesson.contents.map((content) => (
            <div key={content.id} className="bg-white rounded-lg shadow-sm p-6">
              <ContentRenderer content={content} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500 mb-6">
          No content for this lesson yet.
        </div>
      )}

      {/* Quizzes */}
      {quizzes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quizzes</h2>
          <div className="space-y-2">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                to={`/quizzes/${quiz.id}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-900">{quiz.title}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {quiz.question_count} questions | Pass: {quiz.passing_score}%
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Assignments */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Assignments</h2>
          <div className="space-y-2">
            {assignments.map((a) => (
              <Link
                key={a.id}
                to={`/assignments/${a.id}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-900">{a.title}</span>
                  {a.due_date && (
                    <span className="text-xs text-gray-500 ml-2">
                      Due: {new Date(a.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Prev / Next Navigation */}
      <div className="flex items-center justify-between">
        {prevLesson ? (
          <Link
            to={`/courses/${slug}/learn/${prevLesson.id}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            {prevLesson.title}
          </Link>
        ) : (
          <div />
        )}
        {nextLesson ? (
          <Link
            to={`/courses/${slug}/learn/${nextLesson.id}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
          >
            {nextLesson.title}
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
