import { useState } from 'react'
import { Send } from 'lucide-react'
import { feedApi } from '../services/feedApi'

interface Props {
  feedItemId: number
  parentId?: number | null
  highlightedText?: string
  onCreated: () => void
  onCancel?: () => void
  placeholder?: string
}

export default function FeedResponseForm({
  feedItemId,
  parentId = null,
  highlightedText = '',
  onCreated,
  onCancel,
  placeholder = 'Share your thoughts...',
}: Props) {
  const [bodyText, setBodyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bodyText.trim() || submitting) return

    setSubmitting(true)
    try {
      await feedApi.createResponse(feedItemId, {
        body_text: bodyText.trim(),
        highlighted_text: highlightedText,
        parent: parentId,
      })
      setBodyText('')
      onCreated()
    } catch {
      // Could show toast error here
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      {highlightedText && (
        <div className="border-l-2 border-blue-300 pl-3 py-1 mb-2 text-sm text-gray-500 italic bg-blue-50 rounded-r">
          &ldquo;{highlightedText}&rdquo;
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
        />
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            disabled={!bodyText.trim() || submitting}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
