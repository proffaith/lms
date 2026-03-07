import { useState } from 'react'
import { Lightbulb, ThumbsDown, Link2, HelpCircle } from 'lucide-react'
import { feedApi } from '../services/feedApi'
import type { FeedReactionType, FeedReactionTarget } from '@/types'

interface Props {
  targetType: FeedReactionTarget
  targetId: number
  reactionCounts: Partial<Record<FeedReactionType, number>>
  myReactions: FeedReactionType[]
  onUpdate?: () => void
}

const REACTIONS: {
  type: FeedReactionType
  label: string
  icon: typeof Lightbulb
  activeColor: string
}[] = [
  { type: 'interesting', label: 'Interesting', icon: Lightbulb, activeColor: 'text-yellow-500' },
  { type: 'disagree', label: 'Disagree', icon: ThumbsDown, activeColor: 'text-red-500' },
  { type: 'connects', label: 'Connects', icon: Link2, activeColor: 'text-blue-500' },
  { type: 'question', label: 'Question', icon: HelpCircle, activeColor: 'text-purple-500' },
]

export default function FeedReactionBar({
  targetType,
  targetId,
  reactionCounts,
  myReactions,
  onUpdate,
}: Props) {
  const [localReactions, setLocalReactions] = useState<FeedReactionType[]>(myReactions)
  const [localCounts, setLocalCounts] = useState(reactionCounts)
  const [toggling, setToggling] = useState<FeedReactionType | null>(null)

  const handleToggle = async (type: FeedReactionType) => {
    if (toggling) return
    setToggling(type)

    try {
      const { data } = await feedApi.toggleReaction({
        reaction_type: type,
        target_type: targetType,
        target_id: targetId,
      })

      if (data.toggled === 'added') {
        setLocalReactions((prev) => [...prev, type])
        setLocalCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }))
      } else {
        setLocalReactions((prev) => prev.filter((r) => r !== type))
        setLocalCounts((prev) => ({
          ...prev,
          [type]: Math.max((prev[type] || 0) - 1, 0),
        }))
      }
      onUpdate?.()
    } catch {
      // Silently fail — UI is already optimistically updated
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="flex gap-1">
      {REACTIONS.map(({ type, label, icon: Icon, activeColor }) => {
        const isActive = localReactions.includes(type)
        const count = localCounts[type] || 0

        return (
          <button
            key={type}
            onClick={() => handleToggle(type)}
            disabled={toggling === type}
            title={label}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
              transition-colors border
              ${
                isActive
                  ? `${activeColor} bg-gray-50 border-current font-medium`
                  : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
