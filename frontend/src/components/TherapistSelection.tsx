import { useState } from 'react'
import { UserCircle, CheckCircle, Calendar, ArrowLeft, Award } from 'lucide-react'
import BookingForm from './BookingForm'
import type { Therapist } from '../lib/types'

interface TherapistSelectionProps {
  therapists: Therapist[];
  inquiryId: string | null;
  onBack: () => void;
}

export default function TherapistSelection({ therapists, inquiryId, onBack }: TherapistSelectionProps) {
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)

  if (selectedTherapist) {
    return (
      <BookingForm
        therapist={selectedTherapist}
        inquiryId={inquiryId}
        onBack={() => setSelectedTherapist(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-green-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to chat
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl font-bold text-gray-800">We Found Great Matches!</h1>
          </div>
          <p className="text-gray-600">
            Based on your needs, we've found {therapists.length} therapist{therapists.length > 1 ? 's' : ''} who can help you.
          </p>
        </div>

        {/* Therapists Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {therapists.map((therapist) => (
            <div
              key={therapist.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border-2 border-transparent hover:border-green-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-gradient-to-r from-green-800 to-green-900 p-4 rounded-xl shadow-md">
                  <UserCircle className="w-12 h-12 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{therapist.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Award className="w-4 h-4" />
                    <span>Licensed Professional</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-3">{therapist.bio}</p>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {therapist.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium border border-green-200"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Accepted Insurance</p>
                  <div className="flex flex-wrap gap-2">
                    {therapist.accepted_insurance.map((insurance, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium capitalize"
                      >
                        {insurance}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTherapist(therapist)}
                className="w-full bg-gradient-to-r from-green-800 to-green-900 text-white rounded-xl px-6 py-3 font-semibold hover:shadow-lg hover:from-green-900 hover:to-green-950 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Calendar className="w-5 h-5" />
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

