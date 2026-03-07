import {
  ExternalLink,
  Globe,
  GraduationCap,
  Pin,
  Sparkles,
  Star,
  User as UserIcon,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { feedApi } from '../services/feedApi'
import FeedReactionBar from './FeedReactionBar'
import FeedBookmarkButton from './FeedBookmarkButton'
import FeedResponseThread from './FeedResponseThread'
import FeedMilestoneCard from './FeedMilestoneCard'
import type { FeedItem } from '@/types'

interface Props {
  item: FeedItem
  onUpdate?: () => void
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
    accent: '',
    badge: '',
    badgeLabel: '',
    icon: Star,
  },
}

export default function FeedItemCard({ item, onUpdate }: Props) {
  const user = useAuthStore((s) => s.user)
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin'

  // Milestones render as their own card type
  if (item.item_type === 'milestone') {
    return <FeedMilestoneCard item={item} />
  }

  const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.student

  const handlePin = async () => {
    await feedApi.togglePin(item.id)
    onUpdate?.()
  }

  const handleFeature = async () => {
    await feedApi.toggleFeature(item.id)
    onUpdate?.()
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${config.accent} mb-4 overflow-hidden`}
    >
      <div className="p-4">
        {/* Header row: avatar + name + badges + time */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Author avatar */}
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
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
                  <config.icon className="w-3 h-3" />
                  {config.badgeLabel}
                </span>
                {item.is_pinned && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-orange-500 font-medium">
                    <Pin className="w-3 h-3" /> Pinned
                  </span>
                )}
                {item.is_featured && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-yellow-500 font-medium">
                    <Sparkles className="w-3 h-3" /> Featured
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{formatTimeAgo(item.created_at)}</span>
            </div>
          </div>

          {/* Actions (instructor) */}
          <div className="flex items-center gap-1">
            {isInstructor && (
              <>
                <button
                  onClick={handlePin}
                  title={item.is_pinned ? 'Unpin' : 'Pin'}
                  className={`p-1 rounded transition-colors ${
                    item.is_pinned
                      ? 'text-orange-500'
                      : 'text-gray-300 hover:text-gray-500'
                  }`}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFeature}
                  title={item.is_featured ? 'Unfeature' : 'Feature'}
                  className={`p-1 rounded transition-colors ${
                    item.is_featured
                      ? 'text-yellow-500'
                      : 'text-gray-300 hover:text-gray-500'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </>
            )}
            <FeedBookmarkButton
              feedItemId={item.id}
              isBookmarked={item.is_bookmarked}
            />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>

        {/* Summary */}
        {item.summary && (
          <p className="text-sm text-gray-600 mb-2">{item.summary}</p>
        )}

        {/* Course objective badge */}
        {item.course_objective_code && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600 mb-2">
            {item.course_objective_code}
          </span>
        )}

        {/* Related item link */}
        {item.related_item_title && (
          <div className="text-xs text-blue-600 mb-2">
            Revisiting: <span className="font-medium">{item.related_item_title}</span>
          </div>
        )}

        {/* Source link */}
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {new URL(item.source_url).hostname}
          </a>
        )}

        {/* Reaction bar */}
        <div className="mt-3">
          <FeedReactionBar
            targetType="item"
            targetId={item.id}
            reactionCounts={item.reaction_counts}
            myReactions={item.my_reactions}
          />
        </div>

        {/* Response thread */}
        {item.response_count > 0 && (
          <FeedResponseThread
            feedItemId={item.id}
            responseCount={item.response_count}
          />
        )}
      </div>
    </div>
  )
}
