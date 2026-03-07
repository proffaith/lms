import api from '@/lib/api'
import type {
  EngagementProfile,
  FeedBookmark,
  FeedItem,
  FeedReactionTarget,
  FeedReactionType,
  FeedResponse,
  PaginatedResponse,
} from '@/types'

export const feedApi = {
  // Feed items
  getFeed: (courseSlug: string, page = 1) =>
    api.get<PaginatedResponse<FeedItem>>(`/courses/${courseSlug}/feed/?page=${page}`),

  getFeedItem: (id: number) =>
    api.get<FeedItem>(`/feed-items/${id}/`),

  createFeedItem: (
    courseSlug: string,
    data: {
      item_type: string
      title: string
      summary?: string
      body_html?: string
      source_url?: string
      source_metadata?: Record<string, unknown>
      course_objective?: number | null
      related_item?: number | null
    },
  ) => api.post<FeedItem>(`/courses/${courseSlug}/feed/`, data),

  updateFeedItem: (id: number, data: Partial<FeedItem>) =>
    api.patch<FeedItem>(`/feed-items/${id}/`, data),

  deleteFeedItem: (id: number) => api.delete(`/feed-items/${id}/`),

  togglePin: (id: number) =>
    api.post<{ is_pinned: boolean }>(`/feed-items/${id}/pin/`),

  toggleFeature: (id: number) =>
    api.post<{ is_featured: boolean }>(`/feed-items/${id}/feature/`),

  // Responses
  getResponses: (itemId: number) =>
    api.get<FeedResponse[]>(`/feed-items/${itemId}/responses/`),

  createResponse: (
    itemId: number,
    data: {
      body_text: string
      highlighted_text?: string
      parent?: number | null
    },
  ) => api.post<FeedResponse>(`/feed-items/${itemId}/responses/`, data),

  updateResponse: (id: number, data: { body_text: string }) =>
    api.patch<FeedResponse>(`/feed-responses/${id}/`, data),

  deleteResponse: (id: number) => api.delete(`/feed-responses/${id}/`),

  // Reactions (toggle)
  toggleReaction: (data: {
    reaction_type: FeedReactionType
    target_type: FeedReactionTarget
    target_id: number
  }) =>
    api.post<{ toggled: 'added' | 'removed'; id?: number }>(
      '/feed-reactions/',
      data,
    ),

  // Bookmarks
  getBookmarks: (courseSlug: string) =>
    api.get<FeedBookmark[]>(`/courses/${courseSlug}/feed/bookmarks/`),

  createBookmark: (feedItemId: number, note?: string) =>
    api.post<FeedBookmark>('/feed-bookmarks/', {
      feed_item: feedItemId,
      note: note || '',
    }),

  updateBookmark: (id: number, note: string) =>
    api.patch<FeedBookmark>(`/feed-bookmarks/${id}/`, { note }),

  deleteBookmark: (id: number) => api.delete(`/feed-bookmarks/${id}/`),

  // Engagement
  getMyEngagement: (courseSlug: string) =>
    api.get<EngagementProfile>(`/courses/${courseSlug}/engagement/`),

  getEngagementRoster: (courseSlug: string) =>
    api.get<EngagementProfile[]>(`/courses/${courseSlug}/engagement/roster/`),
}
