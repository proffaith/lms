import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '../services/authApi'

export function useAuth() {
  const { user, isAuthenticated, login, logout, setUser } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && !user) {
      authApi
        .getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          logout()
          navigate('/login')
        })
    }
  }, [isAuthenticated, user, setUser, logout, navigate])

  const handleLogin = async (username: string, password: string) => {
    const { data } = await authApi.login(username, password)
    // Store tokens first so the interceptor can attach the Bearer token
    useAuthStore.getState().setTokens(data.access, data.refresh)
    const meRes = await authApi.getMe()
    login(meRes.data, data.access, data.refresh)
    navigate('/')
  }

  const handleRegister = async (formData: {
    username: string
    email: string
    password: string
    password_confirm: string
    first_name: string
    last_name: string
    role: string
  }) => {
    const { data } = await authApi.register(formData)
    login(data.user, data.tokens.access, data.tokens.refresh)
    navigate('/')
  }

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        // Ignore logout errors
      }
    }
    logout()
    navigate('/login')
  }

  return { user, isAuthenticated, handleLogin, handleRegister, handleLogout }
}
