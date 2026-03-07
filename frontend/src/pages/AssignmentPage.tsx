import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  FileText,
  Upload,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Assignment, Submission } from '@/types'

export default function AssignmentPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const user = useAuthStore((s) => s.user)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [textContent, setTextContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!assignmentId) return
    api.get<Assignment>(`/assignments/${assignmentId}/`)
      .then((res) => {
        setAssignment(res.data)
        // Try to fetch student's own submission
        return api.get(`/assignments/${assignmentId}/submissions/`).catch(() => ({ data: [] }))
      })
      .then((subRes) => {
        const subs = Array.isArray(subRes.data) ? subRes.data : subRes.data.results || []
        // Find current user's submission
        const mine = subs.find((s: Submission) => s.student === user?.id)
        if (mine) setMySubmission(mine)
      })
      .finally(() => setLoading(false))
  }, [assignmentId, user?.id])

  const handleSubmit = async () => {
    if (!assignmentId) return
    setSubmitting(true)

    const formData = new FormData()
    if (textContent.trim()) formData.append('text_content', textContent)
    if (file) formData.append('file', file)

    try {
      const res = await api.post<Submission>(`/assignments/${assignmentId}/submit/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMySubmission(res.data)
      toast.success('Assignment submitted!')
      setTextContent('')
      setFile(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit assignment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-gray-500">Loading assignment...</p>
  if (!assignment) return <p className="text-red-500">Assignment not found.</p>

  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()

  return (
    <div className="max-w-3xl">
      {/* Assignment Details */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
        {assignment.description && (
          <p className="text-gray-600 mb-4 whitespace-pre-wrap">{assignment.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            Max Score: {assignment.max_score}
          </span>
          {assignment.due_date && (
            <span className={clsx(
              'flex items-center gap-1',
              isOverdue ? 'text-red-600' : 'text-gray-500',
            )}>
              <Calendar className="w-4 h-4" />
              Due: {new Date(assignment.due_date).toLocaleDateString()}
              {isOverdue && ' (Overdue)'}
            </span>
          )}
        </div>
      </div>

      {/* Existing Submission */}
      {mySubmission && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Your Submission
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className={clsx(
                'px-2 py-0.5 rounded text-xs font-medium',
                mySubmission.status === 'graded' ? 'bg-green-100 text-green-700' :
                mySubmission.status === 'returned' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700',
              )}>
                {mySubmission.status}
              </span>
              <span className="text-gray-500">
                Submitted {new Date(mySubmission.submitted_at).toLocaleString()}
              </span>
            </div>

            {mySubmission.text_content && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {mySubmission.text_content}
              </div>
            )}

            {mySubmission.file && (
              <a
                href={mySubmission.file}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <FileText className="w-4 h-4" />
                View submitted file
              </a>
            )}

            {mySubmission.status === 'graded' && (
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Score: {mySubmission.score}/{assignment.max_score}
                  </span>
                </div>
                {mySubmission.feedback && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700">
                    <span className="font-medium text-blue-700">Feedback:</span>{' '}
                    {mySubmission.feedback}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Form (only if no submission yet) */}
      {!mySubmission && user?.role === 'student' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Work</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Written Response
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your response here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Upload (optional)
              </label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <FileText className="w-4 h-4" />
                    {file.name}
                    <button
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Click to upload a file</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || (!textContent.trim() && !file)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Assignment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
