import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  GripVertical,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { CourseDetail, CourseObjective } from '@/types'

interface ContentBlock {
  id?: number
  content_type: 'text' | 'video' | 'file'
  title: string
  text_content: string
  video_url: string
  order: number
}

interface LessonDraft {
  id?: number
  title: string
  description: string
  order: number
  contents: ContentBlock[]
}

interface ModuleDraft {
  id?: number
  title: string
  description: string
  order: number
  lessons: LessonDraft[]
}

interface ObjectiveDraft {
  id?: number
  code: string
  description: string
  order: number
}

export default function CourseBuilderPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const isEdit = !!slug

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseSlug, setCourseSlug] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [programId, setProgramId] = useState<number | null>(null)
  const [modules, setModules] = useState<ModuleDraft[]>([])
  const [objectives, setObjectives] = useState<ObjectiveDraft[]>([])
  const [programs, setPrograms] = useState<{ id: number; title: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    api.get('/programs/').then((res) => {
      const data = res.data
      setPrograms(Array.isArray(data) ? data : data.results || [])
    }).catch(() => {})

    if (isEdit && slug) {
      Promise.all([
        api.get<CourseDetail>(`/courses/${slug}/`),
        api.get(`/courses/${slug}/objectives/`).catch(() => ({ data: [] })),
      ]).then(([courseRes, objRes]) => {
        const c = courseRes.data
        setTitle(c.title)
        setDescription(c.description)
        setCourseSlug(c.slug)
        setStatus(c.status as 'draft' | 'published')
        setProgramId(c.program)
        setModules(
          c.modules.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            order: m.order,
            lessons: m.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              description: l.description,
              order: l.order,
              contents: [],
            })),
          })),
        )
        const objData = objRes.data
        const objArray = Array.isArray(objData) ? objData : objData.results || []
        setObjectives(
          objArray.map((o: CourseObjective) => ({
            id: o.id,
            code: o.code,
            description: o.description,
            order: o.order,
          })),
        )
      }).finally(() => setLoading(false))
    }
  }, [isEdit, slug])

  // Load lesson contents when editing
  useEffect(() => {
    if (!isEdit) return
    modules.forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        if (lesson.id && lesson.contents.length === 0) {
          api.get(`/lessons/${lesson.id}/`).then((res) => {
            setModules((prev) =>
              prev.map((m) =>
                m.id === mod.id
                  ? {
                      ...m,
                      lessons: m.lessons.map((l) =>
                        l.id === lesson.id ? { ...l, contents: res.data.contents || [] } : l,
                      ),
                    }
                  : m,
              ),
            )
          })
        }
      })
    })
  }, [isEdit, modules.length])

  const saveCourse = async () => {
    setSaving(true)
    try {
      let courseData: any
      const payload = {
        title,
        description,
        slug: courseSlug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        status,
        program: programId,
      }

      if (isEdit) {
        const res = await api.patch(`/courses/${slug}/`, payload)
        courseData = res.data
      } else {
        const res = await api.post('/courses/', payload)
        courseData = res.data
      }

      const finalSlug = courseData.slug

      // Save objectives
      for (const obj of objectives) {
        if (obj.id) {
          await api.patch(`/objectives/${obj.id}/`, {
            code: obj.code,
            description: obj.description,
            order: obj.order,
          })
        } else {
          const res = await api.post(`/courses/${finalSlug}/objectives/`, {
            code: obj.code,
            description: obj.description,
            order: obj.order,
          })
          obj.id = res.data.id
        }
      }

      // Save modules
      for (let mi = 0; mi < modules.length; mi++) {
        const mod = modules[mi]
        mod.order = mi
        let moduleData: any

        if (mod.id) {
          const res = await api.patch(`/modules/${mod.id}/`, {
            title: mod.title,
            description: mod.description,
            order: mi,
          })
          moduleData = res.data
        } else {
          const res = await api.post(`/courses/${finalSlug}/modules/`, {
            title: mod.title,
            description: mod.description,
            order: mi,
          })
          moduleData = res.data
          mod.id = moduleData.id
        }

        // Save lessons
        for (let li = 0; li < mod.lessons.length; li++) {
          const lesson = mod.lessons[li]
          lesson.order = li
          let lessonData: any

          if (lesson.id) {
            const res = await api.patch(`/lessons/${lesson.id}/`, {
              title: lesson.title,
              description: lesson.description,
              order: li,
            })
            lessonData = res.data
          } else {
            const res = await api.post(`/modules/${mod.id}/lessons/`, {
              title: lesson.title,
              description: lesson.description,
              order: li,
            })
            lessonData = res.data
            lesson.id = lessonData.id
          }

          // Save content blocks
          for (let ci = 0; ci < lesson.contents.length; ci++) {
            const content = lesson.contents[ci]
            content.order = ci
            const contentPayload = {
              content_type: content.content_type,
              title: content.title,
              text_content: content.text_content,
              video_url: content.video_url,
              order: ci,
            }

            if (content.id) {
              await api.patch(`/contents/${content.id}/`, contentPayload)
            } else {
              const res = await api.post(
                `/lessons/${lesson.id}/contents/`,
                contentPayload,
              )
              content.id = res.data.id
            }
          }
        }
      }

      toast.success(isEdit ? 'Course updated!' : 'Course created!')
      navigate(`/courses/${finalSlug}`)
    } catch (err: any) {
      const detail = err.response?.data
      if (detail && typeof detail === 'object') {
        const msg = Object.entries(detail)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('; ')
        toast.error(msg)
      } else {
        toast.error('Failed to save course.')
      }
    } finally {
      setSaving(false)
    }
  }

  // Module helpers
  const addModule = () => {
    setModules((prev) => [
      ...prev,
      { title: '', description: '', order: prev.length, lessons: [] },
    ])
  }
  const removeModule = (idx: number) => setModules((prev) => prev.filter((_, i) => i !== idx))
  const updateModule = (idx: number, field: string, value: string) => {
    setModules((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    )
  }

  // Lesson helpers
  const addLesson = (modIdx: number) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === modIdx
          ? {
              ...m,
              lessons: [
                ...m.lessons,
                { title: '', description: '', order: m.lessons.length, contents: [] },
              ],
            }
          : m,
      ),
    )
  }
  const removeLesson = (modIdx: number, lesIdx: number) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === modIdx
          ? { ...m, lessons: m.lessons.filter((_, j) => j !== lesIdx) }
          : m,
      ),
    )
  }
  const updateLesson = (modIdx: number, lesIdx: number, field: string, value: string) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === modIdx
          ? {
              ...m,
              lessons: m.lessons.map((l, j) =>
                j === lesIdx ? { ...l, [field]: value } : l,
              ),
            }
          : m,
      ),
    )
  }

  // Content helpers
  const addContent = (modIdx: number, lesIdx: number, type: 'text' | 'video' | 'file') => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === modIdx
          ? {
              ...m,
              lessons: m.lessons.map((l, j) =>
                j === lesIdx
                  ? {
                      ...l,
                      contents: [
                        ...l.contents,
                        {
                          content_type: type,
                          title: '',
                          text_content: '',
                          video_url: '',
                          order: l.contents.length,
                        },
                      ],
                    }
                  : l,
              ),
            }
          : m,
      ),
    )
  }
  const removeContent = (modIdx: number, lesIdx: number, conIdx: number) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === modIdx
          ? {
              ...m,
              lessons: m.lessons.map((l, j) =>
                j === lesIdx
                  ? { ...l, contents: l.contents.filter((_, k) => k !== conIdx) }
                  : l,
              ),
            }
          : m,
      ),
    )
  }
  const updateContent = (
    modIdx: number,
    lesIdx: number,
    conIdx: number,
    field: string,
    value: string,
  ) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === modIdx
          ? {
              ...m,
              lessons: m.lessons.map((l, j) =>
                j === lesIdx
                  ? {
                      ...l,
                      contents: l.contents.map((c, k) =>
                        k === conIdx ? { ...c, [field]: value } : c,
                      ),
                    }
                  : l,
              ),
            }
          : m,
      ),
    )
  }

  // Objective helpers
  const addObjective = () => {
    setObjectives((prev) => [
      ...prev,
      { code: `CLO-${prev.length + 1}`, description: '', order: prev.length },
    ])
  }
  const removeObjective = (idx: number) => setObjectives((prev) => prev.filter((_, i) => i !== idx))
  const updateObjective = (idx: number, field: string, value: string) => {
    setObjectives((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)),
    )
  }

  if (loading) return <p className="text-gray-500">Loading course...</p>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Course' : 'Create New Course'}
        </h1>
        <button
          onClick={saveCourse}
          disabled={saving || !title}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Course'}
        </button>
      </div>

      {/* Course Info */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Introduction to Computer Science"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              value={courseSlug}
              onChange={(e) => setCourseSlug(e.target.value)}
              placeholder="auto-generated-from-title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program (optional)</label>
              <select
                value={programId ?? ''}
                onChange={(e) => setProgramId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Learning Objectives
          </h2>
          <button
            onClick={addObjective}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-4 h-4" /> Add Objective
          </button>
        </div>
        {objectives.length === 0 ? (
          <p className="text-sm text-gray-500">No objectives yet. Add learning objectives to define what students will learn.</p>
        ) : (
          <div className="space-y-3">
            {objectives.map((obj, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <input
                  value={obj.code}
                  onChange={(e) => updateObjective(idx, 'code', e.target.value)}
                  placeholder="CLO-1"
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
                />
                <input
                  value={obj.description}
                  onChange={(e) => updateObjective(idx, 'description', e.target.value)}
                  placeholder="Students will be able to..."
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={() => removeObjective(idx)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modules & Lessons */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Modules & Lessons</h2>
          <button
            onClick={addModule}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Module
          </button>
        </div>

        {modules.map((mod, mi) => (
          <div key={mi} className="bg-white rounded-lg shadow-sm border">
            {/* Module header */}
            <div className="p-4 border-b bg-gray-50 rounded-t-lg">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-mono">M{mi + 1}</span>
                <input
                  value={mod.title}
                  onChange={(e) => updateModule(mi, 'title', e.target.value)}
                  placeholder="Module title"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm font-medium"
                />
                <button
                  onClick={() => removeModule(mi)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lessons */}
            <div className="p-4 space-y-4">
              {mod.lessons.map((lesson, li) => (
                <div key={li} className="border rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-gray-400 font-mono">L{li + 1}</span>
                    <input
                      value={lesson.title}
                      onChange={(e) => updateLesson(mi, li, 'title', e.target.value)}
                      placeholder="Lesson title"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => removeLesson(mi, li)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content blocks */}
                  {lesson.contents.length > 0 && (
                    <div className="space-y-3 mb-3 ml-6">
                      {lesson.contents.map((con, ci) => (
                        <div key={ci} className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 px-1.5 py-1 bg-gray-200 rounded mt-1">
                            {con.content_type}
                          </span>
                          {con.content_type === 'text' ? (
                            <textarea
                              value={con.text_content}
                              onChange={(e) => updateContent(mi, li, ci, 'text_content', e.target.value)}
                              placeholder="Enter text content..."
                              rows={3}
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          ) : con.content_type === 'video' ? (
                            <input
                              value={con.video_url}
                              onChange={(e) => updateContent(mi, li, ci, 'video_url', e.target.value)}
                              placeholder="YouTube or Vimeo URL"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <input
                              value={con.title}
                              onChange={(e) => updateContent(mi, li, ci, 'title', e.target.value)}
                              placeholder="File description (upload via API)"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          )}
                          <button
                            onClick={() => removeContent(mi, li, ci)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add content buttons */}
                  <div className="flex items-center gap-2 ml-6">
                    <button
                      onClick={() => addContent(mi, li, 'text')}
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 border border-dashed rounded"
                    >
                      + Text
                    </button>
                    <button
                      onClick={() => addContent(mi, li, 'video')}
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 border border-dashed rounded"
                    >
                      + Video
                    </button>
                    <button
                      onClick={() => addContent(mi, li, 'file')}
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 border border-dashed rounded"
                    >
                      + File
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => addLesson(mi)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-4 h-4" /> Add Lesson
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end pb-8">
        <button
          onClick={saveCourse}
          disabled={saving || !title}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Course'}
        </button>
      </div>
    </div>
  )
}
