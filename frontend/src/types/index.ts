export type UserRole = 'admin' | 'instructor' | 'student'

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  bio: string
  avatar: string | null
  created_at: string
  updated_at: string
}

export interface UserMinimal {
  id: number
  username: string
  full_name: string
  avatar: string | null
}

export interface AuthTokens {
  access: string
  refresh: string
}

// Curriculum
export interface Program {
  id: number
  title: string
  description: string
  status: 'draft' | 'active' | 'archived'
  objective_count: number
  course_count: number
  created_at: string
}

export interface ProgramObjective {
  id: number
  code: string
  description: string
  order: number
}

export interface CourseObjective {
  id: number
  code: string
  description: string
  order: number
  aligned_program_objectives: ProgramObjective[]
}

// Courses
export interface Course {
  id: number
  title: string
  slug: string
  description: string
  thumbnail: string | null
  instructor_name: string
  status: 'draft' | 'published' | 'archived'
  enrollment_count: number
  program: number | null
  created_at: string
}

export interface CourseDetail extends Omit<Course, 'instructor_name'> {
  instructor: UserMinimal
  modules: Module[]
  is_enrolled: boolean
  updated_at: string
}

export interface Module {
  id: number
  title: string
  description: string
  order: number
  lessons: LessonSummary[]
  quiz_count: number
  assignment_count: number
}

export interface LessonSummary {
  id: number
  title: string
  description: string
  order: number
}

export interface Lesson extends LessonSummary {
  contents: LessonContent[]
  created_at: string
  updated_at: string
}

export interface LessonContent {
  id: number
  content_type: 'text' | 'video' | 'file'
  title: string
  text_content: string
  video_url: string
  file: string
  order: number
}

export interface Enrollment {
  id: number
  course: number
  course_title: string
  course_slug: string
  enrolled_at: string
}

// Assessments
export interface Quiz {
  id: number
  title: string
  description: string
  passing_score: number
  time_limit_minutes: number | null
  max_attempts: number
  questions: Question[]
  question_count: number
  created_at: string
  updated_at: string
}

export interface Question {
  id: number
  text: string
  question_type: 'multiple_choice' | 'true_false'
  points: number
  order: number
  choices: AnswerChoice[]
}

export interface AnswerChoice {
  id: number
  text: string
  order: number
  is_correct?: boolean // Only present for instructors
}

export interface QuizAttempt {
  id: number
  score: number
  total_points: number
  earned_points: number
  passed: boolean
  started_at: string
  completed_at: string
  answers?: QuizAnswerResult[]
}

export interface QuizAnswerResult {
  question_id: number
  question_text: string
  selected_choice_text: string
  is_correct: boolean
}

export interface Assignment {
  id: number
  title: string
  description: string
  due_date: string | null
  max_score: number
  course_objective: number | null
  submission_count: number
  created_at: string
  updated_at: string
}

export interface Submission {
  id: number
  student: number
  student_name: string
  file: string
  text_content: string
  status: 'submitted' | 'graded' | 'returned'
  score: number | null
  feedback: string
  submitted_at: string
  graded_at: string | null
}

// Progress
export interface CourseProgress {
  course_id: number
  course_title: string
  course_slug: string
  total_lessons: number
  completed_lessons: number
  progress_percentage: number
}

export interface LessonProgressDetail {
  lesson_id: number
  lesson_title: string
  module_title: string
  completed: boolean
  completed_at: string | null
}

export interface Certificate {
  id: string
  student_name: string
  course_title: string
  course_slug: string
  issued_at: string
}

// Admin
export interface AdminUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  bio: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlatformStats {
  total_users: number
  students: number
  instructors: number
  admins: number
  total_courses: number
  published_courses: number
  total_enrollments: number
  pending_submissions: number
}

// API
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
