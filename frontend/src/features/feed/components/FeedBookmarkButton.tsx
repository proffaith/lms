import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { feedApi } from '../services/feedApi'

interface Props {
  feedItemId: number
  isBookmarked: boolean
  onUpdate?: () => void
}

export default function FeedBookmarkButton({ feedItemId, isBookmarked, onUpdate }: Props) {
  const [bookmarked, setBookmarked] = useState(isBookmarked)
  const [bookmarkId, setBookmarkId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (loading) return
    setLoading(true)

    try {
      if (bookmarked && bookmarkId) {
        await feedApi.deleteBookmark(bookmarkId)
        setBookmarked(false)
        setBookmarkId(null)
      } else {
        const { data } = await feedApi.createBookmark(feedItemId)
        setBookmarked(true)
        setBookmarkId(data.id)
      }
      onUpdate?.()
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      className={`
        p-1 rounded transition-colors
        ${bookmarked ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}
      `}
    >
      <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
    </button>
  )
}
