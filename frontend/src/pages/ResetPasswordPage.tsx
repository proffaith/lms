import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import api from '@/lib/api'

export default function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password/', {
        uid,
        token,
        new_password: password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (detail) {
        setError(detail)
      } else if (err.response?.data?.new_password) {
        setError(err.response.data.new_password.join(' '))
      } else {
        setError('Failed to reset password. The link may have expired.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm">
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Reset Password
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter your new password below.
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-700 p-4 rounded text-sm">
                Password reset successfully! Redirecting to sign in...
              </div>
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="passwordConfirm"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
