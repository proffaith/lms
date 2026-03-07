import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { QuizAttempt } from '@/types'

interface StudentChoice {
  id: number
  text: string
  order: number
}

interface StudentQuestion {
  id: number
  text: string
  question_type: 'multiple_choice' | 'true_false'
  points: number
  order: number
  choices: StudentChoice[]
}

interface StudentQuiz {
  id: number
  title: string
  description: string
  passing_score: number
  time_limit_minutes: number | null
  max_attempts: number
  questions: StudentQuestion[]
}

interface AttemptListItem {
  id: number
  score: number
  passed: boolean
  started_at: string
  completed_at: string
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const [quiz, setQuiz] = useState<StudentQuiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizAttempt | null>(null)
  const [pastAttempts, setPastAttempts] = useState<AttemptListItem[]>([])
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!quizId) return
    Promise.all([
      api.get<StudentQuiz>(`/quizzes/${quizId}/take/`),
      api.get<AttemptListItem[]>(`/quizzes/${quizId}/attempts/`),
    ]).then(([quizRes, attemptsRes]) => {
      setQuiz(quizRes.data)
      const attempts = Array.isArray(attemptsRes.data) ? attemptsRes.data : []
      setPastAttempts(attempts)
    }).catch(() => {
      toast.error('Failed to load quiz.')
    }).finally(() => setLoading(false))
  }, [quizId])

  const startQuiz = () => {
    setStarted(true)
    setCurrentQ(0)
    setAnswers({})
    setResult(null)
    if (quiz?.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60)
    }
  }

  const submitQuiz = useCallback(async () => {
    if (!quiz || submitting) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    const payload = {
      answers: Object.entries(answers).map(([qId, choiceId]) => ({
        question_id: Number(qId),
        selected_choice_id: choiceId,
      })),
    }

    try {
      const res = await api.post<QuizAttempt>(`/quizzes/${quizId}/submit/`, payload)
      setResult(res.data)
      setStarted(false)
      setTimeLeft(null)
      // Refresh attempts
      const attRes = await api.get<AttemptListItem[]>(`/quizzes/${quizId}/attempts/`)
      setPastAttempts(Array.isArray(attRes.data) ? attRes.data : [])
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit quiz.')
    } finally {
      setSubmitting(false)
    }
  }, [quiz, answers, quizId, submitting])

  // Timer
  useEffect(() => {
    if (!started || timeLeft === null) return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [started, timeLeft !== null])

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && started) {
      toast('Time is up! Submitting your answers...')
      submitQuiz()
    }
  }, [timeLeft, started, submitQuiz])

  const selectAnswer = (questionId: number, choiceId: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }))
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) return <p className="text-gray-500">Loading quiz...</p>
  if (!quiz) return <p className="text-red-500">Quiz not found.</p>

  const attemptsUsed = pastAttempts.length
  const canRetake = quiz.max_attempts === 0 || attemptsUsed < quiz.max_attempts

  // Result view
  if (result) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center mb-6">
            {result.passed ? (
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {result.passed ? 'Congratulations!' : 'Not quite there yet'}
            </h1>
            <p className="text-gray-600">
              {result.passed
                ? 'You passed the quiz!'
                : `You need ${quiz.passing_score}% to pass.`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{result.score}%</div>
              <div className="text-xs text-gray-500">Score</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {result.earned_points}/{result.total_points}
              </div>
              <div className="text-xs text-gray-500">Points</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className={clsx(
                'text-2xl font-bold',
                result.passed ? 'text-green-600' : 'text-red-600',
              )}>
                {result.passed ? 'PASS' : 'FAIL'}
              </div>
              <div className="text-xs text-gray-500">Result</div>
            </div>
          </div>

          {/* Answer review */}
          {result.answers && result.answers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Answer Review</h2>
              <div className="space-y-3">
                {result.answers.map((a, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'p-3 rounded-lg border',
                      a.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {a.is_correct ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.question_text}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Your answer: {a.selected_choice_text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {canRetake && (
            <button
              onClick={startQuiz}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Retake Quiz
            </button>
          )}
          <button
            onClick={() => setResult(null)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
          >
            Back to Overview
          </button>
        </div>
      </div>
    )
  }

  // Quiz overview (not started)
  if (!started) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-4">{quiz.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-900">{quiz.questions.length}</div>
              <div className="text-xs text-gray-500">Questions</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-900">{quiz.passing_score}%</div>
              <div className="text-xs text-gray-500">Pass Score</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-900">
                {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'None'}
              </div>
              <div className="text-xs text-gray-500">Time Limit</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-900">
                {quiz.max_attempts === 0 ? 'Unlimited' : `${attemptsUsed}/${quiz.max_attempts}`}
              </div>
              <div className="text-xs text-gray-500">Attempts</div>
            </div>
          </div>

          {canRetake ? (
            <button
              onClick={startQuiz}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              {attemptsUsed > 0 ? 'Retake Quiz' : 'Start Quiz'}
            </button>
          ) : (
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-sm text-yellow-700">
                You have used all {quiz.max_attempts} attempts.
              </p>
            </div>
          )}
        </div>

        {/* Past attempts */}
        {pastAttempts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Past Attempts</h2>
            <div className="space-y-2">
              {pastAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {attempt.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {attempt.score}%
                    </span>
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded font-medium',
                      attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                    )}>
                      {attempt.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(attempt.completed_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Active quiz
  const question = quiz.questions[currentQ]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="max-w-3xl">
      {/* Top bar: timer + progress */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Question {currentQ + 1} of {quiz.questions.length}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            {answeredCount}/{quiz.questions.length} answered
          </span>
          {timeLeft !== null && (
            <div className={clsx(
              'flex items-center gap-1 text-sm font-mono font-medium px-3 py-1 rounded',
              timeLeft < 60 ? 'bg-red-100 text-red-700' :
              timeLeft < 300 ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700',
            )}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {quiz.questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentQ(i)}
            className={clsx(
              'w-8 h-8 rounded text-xs font-medium transition-colors',
              i === currentQ
                ? 'bg-blue-600 text-white'
                : answers[q.id] !== undefined
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">{question.text}</h2>
          <span className="text-xs text-gray-400 shrink-0 ml-4">{question.points} pts</span>
        </div>

        <div className="space-y-2">
          {question.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => selectAnswer(question.id, choice.id)}
              className={clsx(
                'w-full text-left p-3 rounded-lg border-2 transition-colors text-sm',
                answers[question.id] === choice.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700',
              )}
            >
              {choice.text}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
          disabled={currentQ === 0}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        {currentQ < quiz.questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ((p) => Math.min(quiz.questions.length - 1, p + 1))}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={submitQuiz}
            disabled={submitting || answeredCount === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  )
}
