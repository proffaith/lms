import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { feedApi } from '../services/feedApi'
import type { FeedItemType } from '@/types'
import { useAuthStore } from '@/store/authStore'

interface Props {
  courseSlug: string
  onCreated: () => void
  onCancel: () => void
}

export default function FeedCreatePost({ courseSlug, onCreated, onCancel }: Props) {
  const user = useAuthStore((s) => s.user)
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin'

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [citationText, setCitationText] = useState('')
  const [itemType, setItemType] = useState<FeedItemType>(
    isInstructor ? 'instructor' : 'student',
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || submitting) return

    setSubmitting(true)
    try {
      await feedApi.createFeedItem(courseSlug, {
        item_type: itemType,
        title: title.trim(),
        summary: summary.trim(),
        body_html: summary.trim() ? `<p>${summary.trim()}</p>` : '',
        source_url: sourceUrl.trim() || undefined,
        source_metadata: citationText.trim()
          ? { citation: citationText.trim() }
          : undefined,
      })
      onCreated()
    } catch {
      // Could show toast error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">Share with the class</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Post type (instructors only) */}
        {isInstructor && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Post type</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value as FeedItemType)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="instructor">Instructor Post</option>
              <option value="research">Research / Article</option>
              <option value="milestone">Milestone Marker</option>
              <option value="student">Student-style Post</option>
            </select>
          </div>
        )}

        <div className="mb-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — what are you sharing?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            required
          />
        </div>

        <div className="mb-3">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Add some context or your thoughts..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Source & Citation section */}
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-2">
            Sources build credibility. Include a link and citation if available.
          </p>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Link to article, opinion, or resource"
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
          <input
            type="text"
            value={citationText}
            onChange={(e) => setCitationText(e.target.value)}
            placeholder="Citation, e.g., Marbury v. Madison, 5 U.S. 137 (1803)"
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
