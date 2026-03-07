import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, ExternalLink } from 'lucide-react'
import api from '@/lib/api'
import type { Certificate } from '@/types'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Certificate[]>('/my-certificates/')
      .then((res) => setCertificates(Array.isArray(res.data) ? res.data : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">Loading certificates...</p>

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Award className="w-6 h-6" />
        My Certificates
      </h1>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Award className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No certificates yet</h2>
          <p className="text-gray-500 mb-4 text-sm">
            Complete all lessons and pass all quizzes in a course to earn a certificate.
          </p>
          <Link to="/courses" className="text-blue-600 hover:underline font-medium text-sm">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-lg shadow-sm border-2 border-yellow-200 overflow-hidden"
            >
              {/* Certificate card header */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-5">
                <div className="flex items-start justify-between">
                  <Award className="w-10 h-10 text-yellow-500" />
                  <span className="text-xs text-gray-400 font-mono">
                    #{cert.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mt-3">
                  Certificate of Completion
                </h3>
                <p className="text-sm text-gray-600 mt-1">{cert.course_title}</p>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-500">
                    Issued {new Date(cert.issued_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/certificates/${cert.id}`}
                      className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
