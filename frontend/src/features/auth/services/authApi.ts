import api from '@/lib/api'
import type { AuthTokens, User } from '@/types'

interface LoginResponse {
  access: string
  refresh: string
}

interface RegisterResponse {
  user: User
  tokens: AuthTokens
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login/', { username, password }),

  register: (data: {
    username: string
    email: string
    password: string
    password_confirm: string
    first_name: string
    last_name: string
    role: string
  }) => api.post<RegisterResponse>('/auth/register/', data),

  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),

  getMe: () => api.get<User>('/auth/me/'),

  updateProfile: (data: Partial<User>) =>
    api.patch<User>('/auth/me/', data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    }),
}
