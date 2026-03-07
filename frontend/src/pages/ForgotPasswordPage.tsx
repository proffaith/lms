import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import api from '@/lib/api'

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password/', {
        email: identifier,
      })
      setSubmitted(true)
      if (data.reset_url) {
        setResetUrl(data.reset_url)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-center mb-4">
            <KeyRound className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Forgot Password
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter your username or email to reset your password.
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-700 p-4 rounded text-sm">
                If an account exists with that username or email, a reset link
                has been generated.
              </div>

              {resetUrl && (
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-blue-700 mb-2 font-medium">
                    Dev mode — reset link:
                  </p>
                  <Link
                    to={resetUrl}
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {window.location.origin}{resetUrl}
                  </Link>
                </div>
              )}

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Username or Email
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username or email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center text-sm text-gray-600">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-600 hover:underline">
                  Sign In
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
