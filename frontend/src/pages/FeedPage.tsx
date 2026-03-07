import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Compass, Loader2, Bookmark } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { feedApi } from '@/features/feed/services/feedApi'
import FeedItemCard from '@/features/feed/components/FeedItemCard'
import FeedCreatePost from '@/features/feed/components/FeedCreatePost'
import type { FeedItem, EngagementProfile } from '@/types'

export default function FeedPage() {
  const { slug } = useParams<{ slug: string }>()
  const user = useAuthStore((s) => s.user)

  const [items, setItems] = useState<FeedItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [engagement, setEngagement] = useState<EngagementProfile | null>(null)

  const loadFeed = async (p: number, append = false) => {
    if (!slug) return
    const setter = append ? setLoadingMore : setLoading
    setter(true)

    try {
      const { data } = await feedApi.getFeed(slug, p)
      if (append) {
        setItems((prev) => [...prev, ...data.results])
      } else {
        setItems(data.results)
      }
      setTotalCount(data.count)
      setHasMore(!!data.next)
      setPage(p)
    } catch {
      // Could show error
    } finally {
      setter(false)
    }
  }

  const loadEngagement = async () => {
    if (!slug || user?.role !== 'student') return
    try {
      const { data } = await feedApi.getMyEngagement(slug)
      setEngagement(data)
    } catch {
      // May not have engagement yet — that's fine
    }
  }

  useEffect(() => {
    loadFeed(1)
    loadEngagement()
  }, [slug])

  const handleLoadMore = () => {
    loadFeed(page + 1, true)
  }

  const handlePostCreated = () => {
    setShowCreate(false)
    loadFeed(1)
  }

  const handleFeedUpdate = () => {
    loadFeed(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to={`/courses/${slug}`}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-500" />
              Journey
            </h1>
            <p className="text-sm text-gray-500">
              {totalCount} {totalCount === 1 ? 'item' : 'items'} in the journey
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/courses/${slug}/feed/bookmarks`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Bookmark className="w-4 h-4" />
            Saved
          </Link>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Engagement summary for students */}
      {engagement && user?.role === 'student' && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium text-gray-900">Your Engagement</span>
              <span className="text-gray-500 ml-2">
                {engagement.total_responses} responses &middot;{' '}
                {engagement.total_contributions} contributions &middot;{' '}
                {engagement.current_streak} day streak
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-blue-600">
                {Math.round(engagement.computed_grade)}
              </span>
              <span className="text-sm text-gray-500">/100</span>
            </div>
          </div>
        </div>
      )}

      {/* Create post form */}
      {showCreate && slug && (
        <FeedCreatePost
          courseSlug={slug}
          onCreated={handlePostCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Feed items */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <Compass className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">The journey is empty</h3>
          <p className="text-sm text-gray-500">
            Be the first to share something with the class!
          </p>
        </div>
      ) : (
        <>
          {items.map((item) => (
            <FeedItemCard key={item.id} item={item} courseSlug={slug} onUpdate={handleFeedUpdate} />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
