import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, CheckCircle, UserCircle, Mail, User, XCircle } from 'lucide-react'
import { appointmentAPI } from '../lib/supabase'
import type { Therapist } from '../lib/types'

interface BookingFormProps {
  therapist: Therapist;
  inquiryId: string | null;
  onBack: () => void;
  prefillData?: {
    name?: string;
    email?: string;
    preferred_time?: string;
    day_type?: string;
  };
}

interface FormData {
  name: string;
  email: string;
  date: string;
  time: string;
  notes: string;
}

interface BookingDetails {
  id: string;
  [key: string]: any;
}

export default function BookingForm({ therapist, inquiryId, onBack, prefillData }: BookingFormProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    name: prefillData?.name || '',
    email: prefillData?.email || '',
    date: '',
    time: prefillData?.preferred_time || '',
    notes: ''
  })
  const [showConfirmation, setShowConfirmation] = useState<boolean>(!!prefillData?.name && !!prefillData?.email)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isBooked, setIsBooked] = useState<boolean>(false)
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null)

  // Auto-redirect to home after 5 seconds if booked
  useEffect(() => {
    if (isBooked) {
      const timer = setTimeout(() => {
        navigate('/')
      }, 5000) // Redirect after 5 seconds
      return () => clearTimeout(timer)
    }
  }, [isBooked, navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log('📝 Booking form submitted');
      console.log('📝 Form data:', formData);
      console.log('📝 Therapist ID:', therapist.id);
      console.log('📝 Inquiry ID:', inquiryId);
      
      const startTime = new Date(`${formData.date}T${formData.time}`)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour later
      
      console.log('📝 Start time:', startTime.toISOString());
      console.log('📝 End time:', endTime.toISOString());

      const response = await appointmentAPI.bookAppointment(
        therapist.id,
        inquiryId,
        startTime.toISOString(),
        {
          patient_name: formData.name,
          patient_email: formData.email,
          notes: formData.notes
        }
      )

      console.log('✅ Booking response received:', response);
      console.log('✅ Appointment ID:', response.appointment?.id);
      console.log('✅ Calendar Event ID:', response.calendarEventId || 'Not synced to calendar');
      console.log('✅ Therapist ID:', therapist.id);
      console.log('✅ Appointment saved to database:', response.appointment);

      setBookingDetails(response as any)
      setIsBooked(true)
    } catch (error) {
      console.error('❌ Error booking appointment:', error)
      alert(`Failed to book appointment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (isBooked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center py-8 px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-200">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Appointment Confirmed!</h1>
            <p className="text-gray-600 mb-6">
              Your appointment has been successfully booked and saved.
            </p>

            {/* Status Indicators */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Saved to Database</span>
              </div>
              {bookingDetails?.calendarEventId ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Synced to Calendar</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm">Calendar Not Connected</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left border border-gray-100">
              <h2 className="font-semibold text-gray-800 mb-4">Appointment Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserCircle className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Therapist</p>
                    <p className="font-medium text-gray-800">{therapist.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium text-gray-800">
                      {formData.date} at {formData.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Confirmation sent to</p>
                    <p className="font-medium text-gray-800">{formData.email}</p>
                  </div>
                </div>
                {bookingDetails?.calendarEventId && (
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Calendar Event</p>
                      <p className="font-medium text-green-600">Synced to {therapist.name}'s Google Calendar</p>
                      <a
                        href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(therapist.email)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-700 hover:text-green-800 underline mt-1 inline-block"
                      >
                        View in Google Calendar →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-800 text-center mb-4">
                You will be redirected to the home page in a few seconds...
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="bg-green-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-900 transition-colors"
                >
                  Go to Home Page
                </button>
                <button
                  onClick={onBack}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800 text-center">
                <strong>✅ Appointment saved to database</strong> • 
                {bookingDetails?.calendarEventId ? (
                  <span> <strong>✅ Synced to {therapist.name}'s calendar</strong> • </span>
                ) : (
                  <span> <span className="text-gray-600">Calendar not connected</span> • </span>
                )}
                <span> <strong>✅ Visible in admin dashboard</strong></span>
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/')}
                className="bg-green-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-900 transition-colors"
              >
                Go to Home Page
              </button>
              <button
                onClick={onBack}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show confirmation screen if we have pre-filled data
  if (showConfirmation && prefillData?.name && prefillData?.email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center py-8 px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Confirm Your Appointment</h1>
            <p className="text-gray-600">Please review your details and confirm to book</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left border border-gray-200">
            <h2 className="font-semibold text-gray-800 mb-4">Appointment Details</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <UserCircle className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Therapist</p>
                  <p className="font-medium text-gray-800">{therapist.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <UserCircle className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Your Name</p>
                  <p className="font-medium text-gray-800">{formData.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-800">{formData.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Preferred Time</p>
                  <p className="font-medium text-gray-800">{formData.time || prefillData.preferred_time}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800 text-center">
              <strong>Please select a specific date and time below to complete your booking.</strong>
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowConfirmation(false)}
              className="bg-green-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-900 transition-colors"
            >
              Continue to Booking
            </button>
            <button
              onClick={onBack}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-green-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to therapists
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-start gap-4 mb-8 pb-8 border-b border-gray-100">
            <div className="bg-gradient-to-r from-green-800 to-green-900 p-4 rounded-xl shadow-md">
              <UserCircle className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">{therapist.name}</h1>
              <p className="text-gray-600">{therapist.bio}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </div>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-colors"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </div>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-colors"
                  placeholder="555-1234"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Preferred Date
                  </div>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Preferred Time
                  </div>
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-colors resize-none"
                placeholder="Any specific concerns or preferences..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-800 to-green-900 text-white rounded-xl px-6 py-4 font-semibold text-lg hover:shadow-lg hover:from-green-900 hover:to-green-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirm Appointment
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

