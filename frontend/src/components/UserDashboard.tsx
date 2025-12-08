import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogOut, Calendar, MessageSquare, User, Loader, Home } from 'lucide-react'
import type { Session } from '../lib/types'

export default function UserDashboard() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userAppointments, setUserAppointments] = useState<any[]>([])
  const [userInquiries, setUserInquiries] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as Session)
      setLoading(false)
      if (!session) {
        navigate('/admin')
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as Session)
      setLoading(false)
      if (!session) {
        navigate('/admin')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  useEffect(() => {
    if (session?.user?.email) {
      loadUserData()
    }
  }, [session])

  const loadUserData = async () => {
    if (!session?.user?.email) return

    setLoadingData(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Fetch user's appointments
      const appointmentsResponse = await fetch(`${supabaseUrl}/rest/v1/appointments?patient_email=eq.${encodeURIComponent(session.user.email)}&select=*,therapists(name)`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      })

      if (appointmentsResponse.ok) {
        const appointments = await appointmentsResponse.json()
        setUserAppointments(appointments || [])
      }

      // Fetch user's inquiries
      const inquiriesResponse = await fetch(`${supabaseUrl}/rest/v1/inquiries?patient_email=eq.${encodeURIComponent(session.user.email)}&order=created_at.desc&limit=10`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      })

      if (inquiriesResponse.ok) {
        const inquiries = await inquiriesResponse.json()
        setUserInquiries(inquiries || [])
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-green-800" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-green-800" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-600 hover:text-gray-800 transition-colors">
                <Home className="w-6 h-6" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">My Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-5 h-5" />
                <span className="text-sm">{session.user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">My Appointments</p>
                <p className="text-3xl font-bold text-gray-800">{userAppointments.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="w-8 h-8 text-green-800" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">My Inquiries</p>
                <p className="text-3xl font-bold text-gray-800">{userInquiries.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <MessageSquare className="w-8 h-8 text-blue-800" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Account Status</p>
                <p className="text-lg font-semibold text-green-800">Active</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <User className="w-8 h-8 text-green-800" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                My Appointments
              </h2>
            </div>
            <div className="p-6">
              {loadingData ? (
                <div className="flex justify-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-green-800" />
                </div>
              ) : userAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No appointments yet</p>
                  <Link
                    to="/chat"
                    className="mt-4 inline-block text-green-800 hover:underline font-semibold"
                  >
                    Book an appointment →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {userAppointments.map((appointment: any) => (
                    <div
                      key={appointment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {appointment.therapists?.name || 'Therapist'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(appointment.appointment_date).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          Scheduled
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Inquiries */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                My Inquiries
              </h2>
            </div>
            <div className="p-6">
              {loadingData ? (
                <div className="flex justify-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-green-800" />
                </div>
              ) : userInquiries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No inquiries yet</p>
                  <Link
                    to="/chat"
                    className="mt-4 inline-block text-green-800 hover:underline font-semibold"
                  >
                    Start a conversation →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {userInquiries.map((inquiry: any) => (
                    <div
                      key={inquiry.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {inquiry.extracted_specialty || 'General Inquiry'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {inquiry.insurance_info && `Insurance: ${inquiry.insurance_info}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(inquiry.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            inquiry.status === 'booked'
                              ? 'bg-green-100 text-green-800'
                              : inquiry.status === 'matched'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {inquiry.status || 'New'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="flex gap-4 flex-wrap">
            <Link
              to="/chat"
              className="bg-gradient-to-r from-green-800 to-green-900 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-900 hover:to-green-950 transition-all shadow-md hover:shadow-lg"
            >
              Start New Chat
            </Link>
            <Link
              to="/chat"
              className="bg-white border-2 border-green-800 text-green-800 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-all"
            >
              Book Appointment
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

