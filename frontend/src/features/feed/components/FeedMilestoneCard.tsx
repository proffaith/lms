import { Flag } from 'lucide-react'
import type { FeedItem } from '@/types'

interface Props {
  item: FeedItem
}

export default function FeedMilestoneCard({ item }: Props) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-4 text-center">
      <div className="inline-flex items-center gap-2 text-amber-700">
        <Flag className="w-5 h-5" />
        <span className="font-semibold">{item.title}</span>
      </div>
      {item.summary && (
        <p className="text-sm text-amber-600 mt-1">{item.summary}</p>
      )}
      <p className="text-xs text-amber-400 mt-2">
        {new Date(item.created_at).toLocaleDateString()}
      </p>
    </div>
  )
}
