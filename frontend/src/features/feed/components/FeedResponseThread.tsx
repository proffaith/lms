import { useEffect, useState } from 'react'
import { MessageSquare, Reply } from 'lucide-react'
import { feedApi } from '../services/feedApi'
import FeedReactionBar from './FeedReactionBar'
import FeedResponseForm from './FeedResponseForm'
import type { FeedResponse } from '@/types'

interface Props {
  feedItemId: number
  responseCount: number
}

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
      {/* Highlighted text annotation */}
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

          <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.body_text}</p>

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
              <Reply className="w-3.5 h-3.5" />
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

export default function FeedResponseThread({ feedItemId, responseCount }: Props) {
  const [responses, setResponses] = useState<FeedResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const loadResponses = async () => {
    setLoading(true)
    try {
      const { data } = await feedApi.getResponses(feedItemId)
      setResponses(data)
    } catch {
      // Could show error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (expanded) {
      loadResponses()
    }
  }, [expanded, feedItemId])

  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <MessageSquare className="w-4 h-4" />
        {responseCount} {responseCount === 1 ? 'response' : 'responses'}
      </button>

      {expanded && (
        <div className="mt-2">
          {loading ? (
            <p className="text-sm text-gray-400 py-2">Loading responses...</p>
          ) : (
            <>
              {/* Response list */}
              <div className="divide-y divide-gray-50">
                {responses.map((resp) => (
                  <ResponseCard
                    key={resp.id}
                    response={resp}
                    feedItemId={feedItemId}
                    onRefresh={loadResponses}
                  />
                ))}
              </div>

              {/* New response form */}
              <FeedResponseForm
                feedItemId={feedItemId}
                onCreated={loadResponses}
                placeholder="Add a response..."
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
