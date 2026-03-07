import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Inbox,
  MessageSquare,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { Course, PaginatedResponse, Submission } from '@/types'

interface AssignmentWithLesson {
  id: number
  title: string
  due_date: string | null
  max_score: number
  submission_count: number
  lesson: number
}

interface GradingView {
  assignmentId: number
  assignmentTitle: string
  maxScore: number
  submissions: Submission[]
}

export default function SubmissionsPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [assignments, setAssignments] = useState<AssignmentWithLesson[]>([])
  const [grading, setGrading] = useState<GradingView | null>(null)
  const [loading, setLoading] = useState(true)
  const [gradingScore, setGradingScore] = useState<string>('')
  const [gradingFeedback, setGradingFeedback] = useState('')
  const [gradingSubmissionId, setGradingSubmissionId] = useState<number | null>(null)
  const [submittingGrade, setSubmittingGrade] = useState(false)

  // Load instructor's courses
  useEffect(() => {
    api.get<PaginatedResponse<Course>>('/courses/')
      .then((res) => {
        setCourses(res.data.results)
        if (res.data.results.length > 0) {
          setSelectedCourse(res.data.results[0].slug)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  // Load assignments when course changes
  useEffect(() => {
    if (!selectedCourse) return
    api.get(`/courses/${selectedCourse}/`).then((courseRes) => {
      const modules = courseRes.data.modules || []
      const lessonIds: number[] = modules.flatMap((m: any) =>
        m.lessons.map((l: any) => l.id),
      )
      // Fetch assignments for all lessons
      Promise.all(
        lessonIds.map((lid) =>
          api.get(`/lessons/${lid}/assignments/`).then((res) => {
            const data = Array.isArray(res.data) ? res.data : res.data.results || []
            return data.map((a: any) => ({ ...a, lesson: lid }))
          }).catch(() => []),
        ),
      ).then((results) => {
        setAssignments(results.flat())
      })
    })
  }, [selectedCourse])

  const openGrading = async (assignment: AssignmentWithLesson) => {
    try {
      const res = await api.get(`/assignments/${assignment.id}/submissions/`)
      const subs = Array.isArray(res.data) ? res.data : res.data.results || []
      setGrading({
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        maxScore: assignment.max_score,
        submissions: subs,
      })
    } catch {
      toast.error('Failed to load submissions.')
    }
  }

  const startGrading = (submission: Submission) => {
    setGradingSubmissionId(submission.id)
    setGradingScore(submission.score?.toString() || '')
    setGradingFeedback(submission.feedback || '')
  }

  const submitGrade = async () => {
    if (gradingSubmissionId === null || !gradingScore) return
    setSubmittingGrade(true)
    try {
      await api.patch(`/submissions/${gradingSubmissionId}/grade/`, {
        score: Number(gradingScore),
        feedback: gradingFeedback,
      })
      toast.success('Grade saved!')
      // Refresh submissions
      if (grading) {
        const res = await api.get(`/assignments/${grading.assignmentId}/submissions/`)
        const subs = Array.isArray(res.data) ? res.data : res.data.results || []
        setGrading({ ...grading, submissions: subs })
      }
      setGradingSubmissionId(null)
      setGradingScore('')
      setGradingFeedback('')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save grade.')
    } finally {
      setSubmittingGrade(false)
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>

  // Grading detail view
  if (grading) {
    return (
      <div className="max-w-4xl">
        <button
          onClick={() => { setGrading(null); setGradingSubmissionId(null) }}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 mb-4"
        >
          &larr; Back to assignments
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{grading.assignmentTitle}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {grading.submissions.length} submission{grading.submissions.length !== 1 ? 's' : ''} |
          Max score: {grading.maxScore}
        </p>

        {grading.submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grading.submissions.map((sub) => (
              <div key={sub.id} className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-medium text-gray-900">{sub.student_name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(sub.submitted_at).toLocaleString()}
                    </span>
                  </div>
                  <span className={clsx(
                    'text-xs px-2 py-0.5 rounded font-medium',
                    sub.status === 'graded' ? 'bg-green-100 text-green-700' :
                    sub.status === 'returned' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700',
                  )}>
                    {sub.status}
                  </span>
                </div>

                {sub.text_content && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {sub.text_content}
                  </div>
                )}

                {sub.file && (
                  <a
                    href={sub.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-3"
                  >
                    <FileText className="w-4 h-4" /> View file
                  </a>
                )}

                {sub.status === 'graded' && gradingSubmissionId !== sub.id && (
                  <div className="border-t pt-3 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">
                        Score: {sub.score}/{grading.maxScore}
                      </span>
                      {sub.feedback && (
                        <p className="text-gray-500 text-xs mt-1">{sub.feedback}</p>
                      )}
                    </div>
                    <button
                      onClick={() => startGrading(sub)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Re-grade
                    </button>
                  </div>
                )}

                {sub.status === 'submitted' && gradingSubmissionId !== sub.id && (
                  <button
                    onClick={() => startGrading(sub)}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Grade
                  </button>
                )}

                {/* Grading form */}
                {gradingSubmissionId === sub.id && (
                  <div className="border-t pt-3 mt-3 space-y-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Score</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={gradingScore}
                            onChange={(e) => setGradingScore(e.target.value)}
                            min={0}
                            max={grading.maxScore}
                            className="w-20 border rounded px-2 py-1 text-sm"
                          />
                          <span className="text-sm text-gray-500">/ {grading.maxScore}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Feedback</label>
                      <textarea
                        value={gradingFeedback}
                        onChange={(e) => setGradingFeedback(e.target.value)}
                        rows={3}
                        className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                        placeholder="Optional feedback..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={submitGrade}
                        disabled={submittingGrade || !gradingScore}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {submittingGrade ? 'Saving...' : 'Save Grade'}
                      </button>
                      <button
                        onClick={() => setGradingSubmissionId(null)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Assignment list view
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Submissions</h1>

      {/* Course selector */}
      {courses.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.slug}>{c.title}</option>
            ))}
          </select>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No assignments found for this course.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <button
              key={a.id}
              onClick={() => openGrading(a)}
              className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex-1">
                <span className="font-medium text-gray-900">{a.title}</span>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {a.submission_count} submissions
                  </span>
                  {a.due_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due {new Date(a.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
