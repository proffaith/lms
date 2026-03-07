import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Compass,
  ExternalLink,
  Globe,
  GraduationCap,
  Loader2,
  Pin,
  Quote,
  Sparkles,
  Star,
  User as UserIcon,
} from 'lucide-react'
import DOMPurify from 'dompurify'
import { feedApi } from '@/features/feed/services/feedApi'
import FeedReactionBar from '@/features/feed/components/FeedReactionBar'
import FeedBookmarkButton from '@/features/feed/components/FeedBookmarkButton'
import FeedResponseThread from '@/features/feed/components/FeedResponseThread'
import FeedResponseForm from '@/features/feed/components/FeedResponseForm'
import type { FeedItem, FeedResponse } from '@/types'

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const TYPE_CONFIG = {
  research: {
    accent: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    badgeLabel: 'Research',
    icon: Globe,
  },
  instructor: {
    accent: 'border-l-purple-500',
    badge: 'bg-purple-100 text-purple-700',
    badgeLabel: 'Instructor',
    icon: GraduationCap,
  },
  student: {
    accent: 'border-l-green-500',
    badge: 'bg-green-100 text-green-700',
    badgeLabel: 'Student',
    icon: UserIcon,
  },
  milestone: {
    accent: 'border-l-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700',
    badgeLabel: 'Milestone',
    icon: Star,
  },
}

export default function JourneyItemPage() {
  const { slug, itemId } = useParams<{ slug: string; itemId: string }>()

  const [item, setItem] = useState<FeedItem | null>(null)
  const [responses, setResponses] = useState<FeedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingResponses, setLoadingResponses] = useState(false)

  const loadItem = async () => {
    if (!itemId) return
    setLoading(true)
    try {
      const { data } = await feedApi.getFeedItem(Number(itemId))
      setItem(data)
    } catch {
      // Could show error toast
    } finally {
      setLoading(false)
    }
  }

  const loadResponses = async () => {
    if (!itemId) return
    setLoadingResponses(true)
    try {
      const { data } = await feedApi.getResponses(Number(itemId))
      setResponses(data)
    } catch {
      // Could show error
    } finally {
      setLoadingResponses(false)
    }
  }

  useEffect(() => {
    loadItem()
    loadResponses()
  }, [itemId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <Compass className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-700 mb-1">Item not found</h3>
        <p className="text-sm text-gray-500 mb-4">
          This journey item may have been removed.
        </p>
        <Link
          to={`/courses/${slug}/feed`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          &larr; Back to Journey
        </Link>
      </div>
    )
  }

  const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.student
  const citation =
    item.source_metadata && typeof item.source_metadata === 'object'
      ? (item.source_metadata as Record<string, unknown>).citation
      : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        to={`/courses/${slug}/feed`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Journey
      </Link>

      {/* Main card */}
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${config.accent} overflow-hidden`}
      >
        <div className="p-6">
          {/* Status badges */}
          <div className="flex items-center gap-2 mb-4">
            {item.is_pinned && (
              <span className="inline-flex items-center gap-1 text-xs text-orange-500 font-medium">
                <Pin className="w-3 h-3" /> Pinned
              </span>
            )}
            {item.is_featured && (
              <span className="inline-flex items-center gap-1 text-xs text-yellow-500 font-medium">
                <Sparkles className="w-3 h-3" /> Featured
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h1>

          {/* Author row */}
          <div className="flex items-center gap-3 mb-5">
            {item.author ? (
              item.author.avatar ? (
                <img
                  src={item.author.avatar}
                  alt={item.author.full_name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {item.author.full_name.charAt(0)}
                </div>
              )
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">
                  {item.author?.full_name || 'Research Pipeline'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}
                >
                  <config.icon className="w-3 h-3" />
                  {config.badgeLabel}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatTimeAgo(item.created_at)}
              </span>
            </div>

            <div className="ml-auto">
              <FeedBookmarkButton
                feedItemId={item.id}
                isBookmarked={item.is_bookmarked}
              />
            </div>
          </div>

          {/* Citation blockquote */}
          {citation && typeof citation === 'string' && (
            <blockquote className="border-l-4 border-blue-300 bg-blue-50 rounded-r-lg px-4 py-3 mb-5">
              <div className="flex items-start gap-2">
                <Quote className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800 font-medium italic">
                  {citation}
                </span>
              </div>
            </blockquote>
          )}

          {/* Source URL */}
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mb-5"
            >
              <ExternalLink className="w-4 h-4" />
              {(() => {
                try {
                  return new URL(item.source_url).hostname
                } catch {
                  return 'View source'
                }
              })()}
            </a>
          )}

          {/* Course objective badge */}
          {item.course_objective_code && (
            <div className="mb-4">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">
                {item.course_objective_code}
              </span>
            </div>
          )}

          {/* Related item link */}
          {item.related_item_title && (
            <div className="text-sm text-blue-600 mb-4">
              Revisiting:{' '}
              <span className="font-medium">{item.related_item_title}</span>
            </div>
          )}

          {/* Summary */}
          {item.summary && (
            <p className="text-gray-700 mb-5 leading-relaxed">{item.summary}</p>
          )}

          {/* Full body HTML */}
          {item.body_html && (
            <div
              className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4 mb-5"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(item.body_html),
              }}
            />
          )}

          {/* Reaction bar */}
          <div className="pt-3 border-t border-gray-100">
            <FeedReactionBar
              targetType="item"
              targetId={item.id}
              reactionCounts={item.reaction_counts}
              myReactions={item.my_reactions}
            />
          </div>
        </div>
      </div>

      {/* Responses section — always expanded */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-4 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Responses ({item.response_count})
        </h2>

        {loadingResponses ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            Loading responses...
          </p>
        ) : responses.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {responses.map((resp) => (
              <ResponseCard
                key={resp.id}
                response={resp}
                feedItemId={item.id}
                onRefresh={loadResponses}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">
            No responses yet. Be the first to share your thoughts!
          </p>
        )}

        {/* Response form */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <FeedResponseForm
            feedItemId={item.id}
            onCreated={loadResponses}
            placeholder="Share your thoughts on this..."
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Inline ResponseCard (same pattern as FeedResponseThread) ─── */

function ResponseCard({
  response,
  feedItemId,
  onRefresh,
}: {
  response: FeedResponse
  feedItemId: number
  onRefresh: () => void
}) {
  const [showReply, setShowReply] = useState(false)

  return (
    <div className="py-3">
      {response.highlighted_text && (
        <div className="border-l-2 border-blue-300 pl-3 py-1 mb-2 text-sm text-gray-500 italic bg-blue-50 rounded-r">
          &ldquo;{response.highlighted_text}&rdquo;
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {response.author.avatar ? (
            <img
              src={response.author.avatar}
              alt={response.author.full_name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
              {response.author.full_name.charAt(0)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {response.author.full_name}
            </span>
            <span className="text-xs text-gray-400">
              {formatTimeAgo(response.created_at)}
            </span>
          </div>

          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {response.body_text}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <FeedReactionBar
              targetType="response"
              targetId={response.id}
              reactionCounts={response.reaction_counts}
              myReactions={response.my_reactions}
            />
            <button
              onClick={() => setShowReply(!showReply)}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              Reply
            </button>
          </div>

          {showReply && (
            <FeedResponseForm
              feedItemId={feedItemId}
              parentId={response.id}
              onCreated={() => {
                setShowReply(false)
                onRefresh()
              }}
              onCancel={() => setShowReply(false)}
              placeholder="Write a reply..."
            />
          )}

          {/* Nested replies */}
          {response.replies && response.replies.length > 0 && (
            <div className="ml-4 mt-2 border-l border-gray-100 pl-4">
              {response.replies.map((reply) => (
                <ResponseCard
                  key={reply.id}
                  response={reply}
                  feedItemId={feedItemId}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
