import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileJson, CheckCircle, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { Course, PaginatedResponse } from '@/types'

export default function ImportCoursePage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ title: string; slug: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Overwrite mode
  const [mode, setMode] = useState<'create' | 'update'>('create')
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedSlug, setSelectedSlug] = useState('')
  const [loadingCourses, setLoadingCourses] = useState(false)

  useEffect(() => {
    if (mode === 'update' && courses.length === 0) {
      setLoadingCourses(true)
      api
        .get<PaginatedResponse<Course>>('/courses/', { params: { page_size: 1000 } })
        .then((res) => setCourses(res.data.results))
        .finally(() => setLoadingCourses(false))
    }
  }, [mode])

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set false when truly leaving the drop zone (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (!droppedFile) return

    if (!droppedFile.name.endsWith('.json') && droppedFile.type !== 'application/json') {
      toast.error('Only JSON files are accepted.')
      return
    }
    setFile(droppedFile)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    if (mode === 'update' && !selectedSlug) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      if (mode === 'update' && selectedSlug) {
        formData.append('course_slug', selectedSlug)
      }

      const { data } = await api.post('/courses/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setResult({ title: data.title, slug: data.slug })
      toast.success(
        mode === 'update'
          ? 'Course updated successfully!'
          : 'Course imported successfully!',
      )
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Import failed.'
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setFile(null)
    setMode('create')
    setSelectedSlug('')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Upload className="w-6 h-6" />
        Import Course
      </h1>

      <div className="bg-white rounded-lg shadow-sm p-6">
        {result ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900">
              "{result.title}" {mode === 'update' ? 'updated' : 'imported'} successfully
            </h2>
            <p className="text-sm text-gray-500">
              {mode === 'update'
                ? 'The course content has been replaced. Enrollments were preserved.'
                : 'The course was created as a draft. You can now edit and publish it.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate(`/courses/${result.slug}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                View Course
              </button>
              <button
                onClick={() => navigate(`/instructor/courses/${result.slug}/edit`)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
              >
                Edit Course
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
              >
                Import Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Import mode toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Mode
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'create'}
                    onChange={() => {
                      setMode('create')
                      setSelectedSlug('')
                    }}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Create new course</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'update'}
                    onChange={() => setMode('update')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Update existing course</span>
                </label>
              </div>
            </div>

            {/* Course selector for update mode */}
            {mode === 'update' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Course to Update
                </label>
                {loadingCourses ? (
                  <p className="text-sm text-gray-400">Loading courses...</p>
                ) : (
                  <select
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a course to update...</option>
                    {courses.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Updating will replace all modules, lessons, quizzes, and assignments.
                    Student progress and quiz attempts on the old content will be removed.
                    Enrollments will be preserved.
                  </span>
                </div>
              </div>
            )}

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export File (JSON)
              </label>
              <div
                className={clsx(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300',
                )}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-2">
                    <FileJson className="w-10 h-10 text-blue-500 mx-auto" />
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer space-y-2 block">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      Drag and drop or click to select a proffaith export file
                    </p>
                    <p className="text-xs text-gray-400">JSON files only</p>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Upload a JSON file exported from the proffaith coursebuilder.
              {mode === 'create'
                ? ' The course will be created as a draft assigned to you.'
                : ' The selected course\'s content will be replaced.'}
            </p>

            <button
              type="submit"
              disabled={!file || loading || (mode === 'update' && !selectedSlug)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? mode === 'update'
                  ? 'Updating...'
                  : 'Importing...'
                : mode === 'update'
                  ? 'Update Course'
                  : 'Import Course'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
