import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Award, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'
import type { Certificate } from '@/types'

export default function CertificateViewPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!uuid) return
    api.get<Certificate>(`/certificates/${uuid}/`)
      .then((res) => setCertificate(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [uuid])

  if (loading) return <p className="text-gray-500">Verifying certificate...</p>

  if (notFound || !certificate) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
        <p className="text-gray-500">
          This certificate ID could not be verified. It may be invalid or expired.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border-4 border-yellow-300 overflow-hidden">
        {/* Decorative top */}
        <div className="bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 py-8 text-center">
          <Award className="w-20 h-20 text-yellow-500 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-gray-900">Certificate of Completion</h1>
        </div>

        <div className="p-8 text-center">
          <p className="text-gray-500 text-sm mb-2">This is to certify that</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {certificate.student_name}
          </h2>
          <p className="text-gray-500 text-sm mb-2">
            has successfully completed all requirements for
          </p>
          <h3 className="text-xl font-semibold text-blue-700 mb-6">
            {certificate.course_title}
          </h3>

          <div className="flex items-center justify-center gap-2 text-green-600 mb-6">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Verified</span>
          </div>

          <div className="border-t pt-4 flex items-center justify-between text-xs text-gray-400">
            <span>Certificate ID: {certificate.id}</span>
            <span>Issued: {new Date(certificate.issued_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
