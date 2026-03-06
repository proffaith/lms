import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle2,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { CourseObjective, Quiz } from '@/types'

interface ChoiceForm {
  id?: number
  text: string
  is_correct: boolean
  order: number
}

interface QuestionForm {
  id?: number
  text: string
  question_type: 'multiple_choice' | 'true_false'
  points: number
  order: number
  course_objective: number | null
  choices: ChoiceForm[]
}

export default function QuizBuilderPage() {
  const { lessonId, quizId } = useParams<{ lessonId: string; quizId?: string }>()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [timeLimit, setTimeLimit] = useState<string>('')
  const [maxAttempts, setMaxAttempts] = useState(0)
  const [questions, setQuestions] = useState<QuestionForm[]>([])
  const [objectives, setObjectives] = useState<CourseObjective[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!quizId)

  useEffect(() => {
    // Load existing quiz for editing
    if (quizId) {
      api.get<Quiz>(`/quizzes/${quizId}/`).then((res) => {
        const q = res.data
        setTitle(q.title)
        setDescription(q.description || '')
        setPassingScore(q.passing_score)
        setTimeLimit(q.time_limit_minutes?.toString() || '')
        setMaxAttempts(q.max_attempts)
        setQuestions(
          q.questions.map((qn) => ({
            id: qn.id,
            text: qn.text,
            question_type: qn.question_type,
            points: qn.points,
            order: qn.order,
            course_objective: null,
            choices: qn.choices.map((c) => ({
              id: c.id,
              text: c.text,
              is_correct: c.is_correct ?? false,
              order: c.order,
            })),
          })),
        )
      }).finally(() => setLoading(false))
    }
  }, [quizId])

  // Load course objectives for tagging (we need the course slug from the lesson)
  useEffect(() => {
    if (!lessonId) return
    api.get(`/lessons/${lessonId}/`).then((lessonRes) => {
      const moduleId = lessonRes.data.module
      if (moduleId) {
        api.get(`/modules/${moduleId}/`).then((modRes) => {
          const courseSlug = modRes.data.course_slug
          if (courseSlug) {
            api.get(`/courses/${courseSlug}/objectives/`).then((objRes) => {
              const data = Array.isArray(objRes.data) ? objRes.data : objRes.data.results || []
              setObjectives(data)
            }).catch(() => {})
          }
        }).catch(() => {})
      }
    }).catch(() => {})
  }, [lessonId])

  const addQuestion = (type: 'multiple_choice' | 'true_false') => {
    const defaultChoices: ChoiceForm[] =
      type === 'true_false'
        ? [
            { text: 'True', is_correct: true, order: 0 },
            { text: 'False', is_correct: false, order: 1 },
          ]
        : [
            { text: '', is_correct: true, order: 0 },
            { text: '', is_correct: false, order: 1 },
            { text: '', is_correct: false, order: 2 },
            { text: '', is_correct: false, order: 3 },
          ]

    setQuestions((prev) => [
      ...prev,
      {
        text: '',
        question_type: type,
        points: 1,
        order: prev.length,
        course_objective: null,
        choices: defaultChoices,
      },
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, updates: Partial<QuestionForm>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)))
  }

  const updateChoice = (qIndex: number, cIndex: number, updates: Partial<ChoiceForm>) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        return {
          ...q,
          choices: q.choices.map((c, ci) => (ci === cIndex ? { ...c, ...updates } : c)),
        }
      }),
    )
  }

  const setCorrectChoice = (qIndex: number, cIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        return {
          ...q,
          choices: q.choices.map((c, ci) => ({ ...c, is_correct: ci === cIndex })),
        }
      }),
    )
  }

  const addChoice = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        return {
          ...q,
          choices: [...q.choices, { text: '', is_correct: false, order: q.choices.length }],
        }
      }),
    )
  }

  const removeChoice = (qIndex: number, cIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        return { ...q, choices: q.choices.filter((_, ci) => ci !== cIndex) }
      }),
    )
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Quiz title is required.')
      return
    }
    if (questions.length === 0) {
      toast.error('Add at least one question.')
      return
    }

    setSaving(true)
    try {
      let savedQuizId = quizId ? Number(quizId) : null

      const quizData = {
        title,
        description,
        passing_score: passingScore,
        time_limit_minutes: timeLimit ? Number(timeLimit) : null,
        max_attempts: maxAttempts,
      }

      if (savedQuizId) {
        await api.patch(`/quizzes/${savedQuizId}/`, quizData)
      } else {
        const res = await api.post(`/lessons/${lessonId}/quizzes/`, quizData)
        savedQuizId = res.data.id
      }

      // Save questions: delete existing then recreate
      if (quizId) {
        const existingRes = await api.get(`/quizzes/${savedQuizId}/questions/`)
        const existing = Array.isArray(existingRes.data)
          ? existingRes.data
          : existingRes.data.results || []
        for (const eq of existing) {
          await api.delete(`/questions/${eq.id}/`)
        }
      }

      for (const q of questions) {
        await api.post(`/quizzes/${savedQuizId}/questions/`, {
          text: q.text,
          question_type: q.question_type,
          points: q.points,
          order: q.order,
          course_objective: q.course_objective,
          choices: q.choices.map((c, i) => ({
            text: c.text,
            is_correct: c.is_correct,
            order: i,
          })),
        })
      }

      toast.success('Quiz saved!')
      navigate(-1)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save quiz.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500">Loading quiz...</p>

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {quizId ? 'Edit Quiz' : 'New Quiz'}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Quiz'}
        </button>
      </div>

      {/* Quiz Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Quiz title"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
            <input
              type="number"
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              min={0}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="No limit"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts (0 = unlimited)</label>
            <input
              type="number"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              min={0}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300" />
                <span className="text-sm font-medium text-gray-500">Q{qi + 1}</span>
                <span className={clsx(
                  'text-xs px-2 py-0.5 rounded font-medium',
                  q.question_type === 'multiple_choice'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-cyan-100 text-cyan-700',
                )}>
                  {q.question_type === 'multiple_choice' ? 'Multiple Choice' : 'True/False'}
                </span>
              </div>
              <button
                onClick={() => removeQuestion(qi)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter question text"
              />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Points:</label>
                  <input
                    type="number"
                    value={q.points}
                    onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) })}
                    min={1}
                    className="w-16 border rounded px-2 py-1 text-xs"
                  />
                </div>
                {objectives.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Objective:</label>
                    <select
                      value={q.course_objective ?? ''}
                      onChange={(e) =>
                        updateQuestion(qi, {
                          course_objective: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="">None</option>
                      {objectives.map((obj) => (
                        <option key={obj.id} value={obj.id}>
                          {obj.code}: {obj.description.slice(0, 50)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Choices */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Answer Choices</label>
                {q.choices.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <button
                      onClick={() => setCorrectChoice(qi, ci)}
                      className={clsx(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                        c.is_correct
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300 hover:border-green-400',
                      )}
                    >
                      {c.is_correct && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                    <input
                      value={c.text}
                      onChange={(e) => updateChoice(qi, ci, { text: e.target.value })}
                      className={clsx(
                        'flex-1 border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                        c.is_correct && 'border-green-300 bg-green-50',
                      )}
                      placeholder={`Choice ${ci + 1}`}
                      disabled={q.question_type === 'true_false'}
                    />
                    {q.question_type === 'multiple_choice' && q.choices.length > 2 && (
                      <button
                        onClick={() => removeChoice(qi, ci)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {q.question_type === 'multiple_choice' && (
                  <button
                    onClick={() => addChoice(qi)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Add choice
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Question Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => addQuestion('multiple_choice')}
          className="flex items-center gap-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Multiple Choice
        </button>
        <button
          onClick={() => addQuestion('true_false')}
          className="flex items-center gap-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> True/False
        </button>
      </div>
    </div>
  )
}
