import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, adminAPI } from '../lib/supabase'
import { LogOut, Users, Calendar, MessageSquare, Loader, Shield, ArrowLeft, Home, CheckCircle, XCircle, Link2, RefreshCw, ExternalLink, LogIn } from 'lucide-react'
import type { Session, AdminData } from '../lib/types'

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false)
  const [loginError, setLoginError] = useState<string>('')
  const [connectingCalendar, setConnectingCalendar] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false)

  useEffect(() => {
    // Handle email confirmation callback from URL hash
    const handleEmailConfirmation = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      // Check if this is an email confirmation callback
      if (type === 'signup' || type === 'email_change' || (accessToken && refreshToken)) {
        try {
          // Exchange the tokens for a session
          const { data: { session: newSession }, error } = await supabase.auth.setSession({
            access_token: accessToken || '',
            refresh_token: refreshToken || '',
          })

          if (error) {
            console.error('Error setting session from email confirmation:', error)
            setLoginError('Failed to confirm email. Please try logging in.')
          } else if (newSession) {
            // Check if user is admin (you can add admin check logic here)
            // For now, if they confirm email via /admin, assume they're admin
            setSession(newSession as Session)
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
          }
        } catch (err: any) {
          console.error('Error handling email confirmation:', err)
          setLoginError('Failed to confirm email. Please try logging in.')
        }
      }
    }

    // Handle email confirmation first
    handleEmailConfirmation()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session as Session | null)
      setLoading(false)
      if (session?.user) {
        // Ensure user record exists in database
        try {
          const { error: upsertError } = await supabase
            .from('patients')
            .upsert({
              user_id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email || '',
            }, {
              onConflict: 'user_id'
            })

          if (upsertError) {
            // Log but don't block - this is handled by database trigger anyway
            console.warn('⚠️  Could not upsert patient record (non-critical):', upsertError.message)
          }
        } catch (err) {
          // Don't block - this is non-critical
          console.warn('⚠️  Error ensuring patient record (non-critical):', err)
        }
        loadAdminData(session as Session)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as Session | null)
      setLoading(false)
      if (session) {
        loadAdminData(session as Session)
      }
    })

    // Check for OAuth callback results
    const oauthSuccess = searchParams.get('oauth_success')
    const oauthError = searchParams.get('oauth_error')

    if (oauthSuccess === 'true') {
      setNotification({ 
        type: 'success', 
        message: `Google Calendar successfully connected for therapist!` 
      })
      // Reload admin data to show updated calendar status
      if (session) {
        loadAdminData(session)
      }
      // Clean up URL
      setSearchParams({})
    } else if (oauthError) {
      setNotification({ 
        type: 'error', 
        message: `Failed to connect Google Calendar: ${decodeURIComponent(oauthError)}` 
      })
      setSearchParams({})
    }

    // Auto-refresh admin data every 60 seconds when session is active (reduced frequency)
    let refreshInterval: NodeJS.Timeout | null = null
    if (session) {
      refreshInterval = setInterval(() => {
        if (!isLoadingData) {
          console.log('🔄 Auto-refreshing admin data...')
          loadAdminData(session as Session)
        }
      }, 60000) // Refresh every 60 seconds (reduced from 30)
    }

    return () => {
      subscription.unsubscribe()
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [searchParams, setSearchParams]) // Removed session from dependencies to prevent loops

  const loadAdminData = async (session: Session) => {
    // Prevent multiple simultaneous requests
    if (isLoadingData) {
      console.log('⏸️  Admin data load already in progress, skipping...')
      return
    }

    setIsLoadingData(true)
    try {
      console.log('🔄 Loading admin data...')
      const data = await adminAPI.getData(session)
      setAdminData(data)
      console.log('✅ Admin data loaded:', {
        inquiries: data.inquiries?.length || 0,
        appointments: data.appointments?.length || 0,
        therapists: data.therapists?.length || 0,
        stats: data.stats
      })
      console.log('📋 Appointments data:', data.appointments)
      console.log('📊 Stats:', data.stats)
    } catch (error: any) {
      console.error('❌ Error loading admin data:', error)
      // Don't show alert on every error, just log it
      if (error.message && !error.message.includes('Failed to fetch')) {
        alert(`Failed to load admin data: ${error.message}`)
      }
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Check if it's an email confirmation error
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          setLoginError('Please check your email and click the confirmation link before logging in.')
        } else {
          throw error
        }
      } else {
      setSession(data.session as Session)
        // Ensure user record exists in database
        if (data.session?.user) {
          try {
            const { error: insertError } = await supabase
              .from('patients')
              .upsert({
                user_id: data.session.user.id,
                email: data.session.user.email || '',
                name: data.session.user.user_metadata?.name || data.session.user.email || '',
              }, {
                onConflict: 'user_id'
              })

            if (insertError && insertError.code !== '23505') {
              console.error('Error ensuring user record:', insertError)
            }
          } catch (err) {
            console.error('Error ensuring user record:', err)
          }
        }
      }
    } catch (error: any) {
      setLoginError(error.message || 'Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setAdminData(null)
  }

  const handleConnectCalendar = async (therapistId: string) => {
    setConnectingCalendar(therapistId)
    try {
      const { oauth_url } = await adminAPI.getOAuthUrl(therapistId)
      // Redirect to Google OAuth consent screen
      window.location.href = oauth_url
    } catch (error: any) {
      setNotification({ 
        type: 'error', 
        message: `Failed to initiate calendar connection: ${error.message}` 
      })
      setConnectingCalendar(null)
    }
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-green-800 to-green-900 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Login</h1>
              <p className="text-gray-600">Sign in to access your dashboard</p>
          </div>

            <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
              <input
                  id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-transparent outline-none transition-all"
                  placeholder="your@email.com"
              />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
              <input
                  id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your password"
              />
            </div>

            {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-green-800 to-green-900 text-white py-3 rounded-lg font-semibold hover:from-green-900 hover:to-green-950 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoggingIn ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
            </button>
          </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Admin access only. For patient chat, go to{' '}
                <Link to="/chat" className="text-green-800 font-semibold hover:underline">
                  Chat Interface
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 flex items-center justify-between border border-gray-100">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 hover:text-green-800 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            <div className="bg-gradient-to-r from-green-800 to-green-900 p-3 rounded-xl shadow-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">{session.user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => session && loadAdminData(session)}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 font-semibold hover:bg-gray-200 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 font-semibold hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          <button
            onClick={handleLogout}
              className="flex items-center gap-2 bg-green-700 text-white rounded-xl px-4 py-2 font-semibold hover:bg-green-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
          </div>
        </div>

        {!adminData ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-12 h-12 animate-spin text-green-800" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <MessageSquare className="w-8 h-8 text-green-800" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Total Inquiries</p>
                    <p className="text-3xl font-bold text-gray-800">
                      {adminData.inquiries?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                    <Calendar className="w-8 h-8 text-green-800" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Appointments</p>
                    <p className="text-3xl font-bold text-gray-800">
                      {adminData.stats?.totalAppointments ?? adminData.appointments?.length ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Users className="w-8 h-8 text-green-800" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Therapists</p>
                    <p className="text-3xl font-bold text-gray-800">
                      {adminData.therapists?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-green-600" />
                Upcoming Appointments
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2">
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Patient</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Therapist</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Date & Time</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.appointments?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          No appointments yet
                        </td>
                      </tr>
                    ) : (
                      adminData.appointments?.map((appointment) => {
                        const therapist = adminData.therapists?.find(t => t.id === appointment.therapist_id);
                        return (
                          <tr key={appointment.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium">{appointment.patient_name}</div>
                                <div className="text-sm text-gray-500">{appointment.patient_email}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {therapist?.name || 'Unknown'}
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium">
                                  {new Date(appointment.start_time).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(appointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                appointment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {appointment.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Inquiries - Limited to 5 */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                Recent Inquiries
                <span className="text-sm font-normal text-gray-500 ml-2">(Last 5)</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2">
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Patient</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Problem</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.inquiries?.slice(0, 5).map((inquiry) => (
                      <tr key={inquiry.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {inquiry.patient_name || inquiry.patient_email || 'Anonymous'}
                        </td>
                        <td className="py-3 px-4 max-w-md truncate">
                          {inquiry.problem_description}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            inquiry.status === 'matched' ? 'bg-green-100 text-green-700' :
                            inquiry.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {inquiry.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Therapists Management */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Therapists & Calendar Integration</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2">
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Specialties</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Calendar Status</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.therapists?.map((therapist) => {
                      const isConnected = therapist.google_refresh_token && therapist.google_calendar_id
                      const isConnecting = connectingCalendar === therapist.id
                      
                      return (
                        <tr key={therapist.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">{therapist.name}</td>
                          <td className="py-3 px-4 text-gray-600">{therapist.email}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {therapist.specialties.slice(0, 2).map((specialty, idx) => (
                                <span
                                  key={idx}
                                  className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
                                >
                                  {specialty}
                                </span>
                              ))}
                              {therapist.specialties.length > 2 && (
                                <span className="text-xs text-gray-500">+{therapist.specialties.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isConnected ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs font-medium">Connected</span>
                                </span>
                                <button
                                  onClick={() => {
                                    // Open Google Calendar in a new tab
                                    // Use calendar ID if available, otherwise use email
                                    const calendarId = therapist.google_calendar_id || therapist.email
                                    // Google Calendar URL format: https://calendar.google.com/calendar/u/0/r?cid={calendarId}
                                    const calendarUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`
                                    window.open(calendarUrl, '_blank', 'noopener,noreferrer')
                                  }}
                                  className="flex items-center gap-1 text-green-800 hover:text-green-900 hover:bg-green-50 rounded-lg px-2 py-1 transition-colors"
                                  title="Open Google Calendar to view appointments"
                                >
                                  <Calendar className="w-4 h-4" />
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="flex items-center gap-2 text-gray-500">
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs">Not Connected</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {!isConnected ? (
                              <button
                                onClick={() => handleConnectCalendar(therapist.id)}
                                disabled={isConnecting}
                                className="flex items-center gap-2 bg-gradient-to-r from-green-800 to-green-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:shadow-md hover:from-green-900 hover:to-green-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isConnecting ? (
                                  <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Connecting...
                                  </>
                                ) : (
                                  <>
                                    <Link2 className="w-4 h-4" />
                                    Connect Calendar
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500">Calendar Active</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notification Banner */}
            {notification && (
              <div
                className={`mb-6 rounded-xl p-4 flex items-center justify-between ${
                  notification.type === 'success'
                    ? 'bg-green-50 border-2 border-green-200 text-green-800'
                    : 'bg-green-50 border-2 border-green-200 text-green-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {notification.type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">{notification.message}</span>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}

