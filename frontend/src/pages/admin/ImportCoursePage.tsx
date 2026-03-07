import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileJson, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export default function ImportCoursePage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ title: string; slug: string } | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const { data } = await api.post('/courses/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setResult({ title: data.title, slug: data.slug })
      toast.success('Course imported successfully!')
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Import failed.'
      toast.error(detail)
    } finally {
      setLoading(false)
    }
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
              "{result.title}" imported successfully
            </h2>
            <p className="text-sm text-gray-500">
              The course was created as a draft. You can now edit and publish it.
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
                onClick={() => {
                  setResult(null)
                  setFile(null)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
              >
                Import Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export File (JSON)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
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
                      Click to select a proffaith export file
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
              The course will be created as a draft assigned to you.
            </p>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Importing...' : 'Import Course'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
