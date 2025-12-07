import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState<string>('Processing OAuth callback...')
  const hasProcessedRef = React.useRef(false)

  useEffect(() => {
    // Prevent duplicate processing (using ref to persist across renders)
    if (hasProcessedRef.current) return
    hasProcessedRef.current = true

    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state') // therapist_id
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setMessage(`OAuth error: ${decodeURIComponent(error)}`)
        setTimeout(() => {
          navigate('/admin?oauth_error=' + encodeURIComponent(error))
        }, 2000)
        return
      }

      if (!code || !state) {
        setStatus('error')
        setMessage('Missing authorization code or state parameter')
        setTimeout(() => {
          navigate('/admin?oauth_error=missing_parameters')
        }, 2000)
        return
      }

      try {
        // Call backend function with anon key to process OAuth callback
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Missing Supabase configuration')
        }

        const response = await fetch(
          `${supabaseUrl}/functions/v1/google-oauth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
          const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`
          
          // If it's an invalid_grant error, check if calendar might already be connected
          if (errorMessage.includes('invalid_grant') || errorMessage.includes('already used')) {
            // Check if therapist already has calendar connected (might be a duplicate attempt)
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
            
            try {
              const checkResponse = await fetch(
                `${supabaseUrl}/rest/v1/therapists?id=eq.${state}&select=id,google_refresh_token,google_calendar_id`,
                {
                  headers: {
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                  },
                }
              )
              
              if (checkResponse.ok) {
                const therapistData = await checkResponse.json()
                if (therapistData && therapistData[0]?.google_refresh_token) {
                  // Calendar is already connected - this is just a duplicate attempt
                  setStatus('success')
                  setMessage('Calendar is already connected!')
                  setTimeout(() => {
                    navigate('/admin?oauth_success=true&therapist_id=' + state)
                  }, 1500)
                  return
                }
              }
            } catch (checkError) {
              // Ignore check error, proceed with original error
            }
            
            throw new Error('Authorization code expired or already used. Please click "Connect Calendar" again to generate a new code.')
          }
          
          throw new Error(errorMessage)
        }

        const data = await response.json()

        if (data.success) {
          // Success - redirect to admin
          setStatus('success')
          setMessage('Calendar connected successfully!')
          setTimeout(() => {
            navigate('/admin?oauth_success=true&therapist_id=' + state)
          }, 1500)
        } else {
          throw new Error(data.error || 'Failed to connect calendar')
        }
      } catch (error: any) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setMessage(error.message || 'Failed to process OAuth callback')
        setTimeout(() => {
          navigate('/admin?oauth_error=' + encodeURIComponent(error.message || 'callback_failed'))
        }, 2000)
      }
    }

    handleCallback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center border border-gray-100">
        {status === 'processing' && (
          <>
            <Loader className="w-16 h-16 animate-spin text-green-800 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Processing...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Success!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to admin dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-green-800" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to admin dashboard...</p>
          </>
        )}
      </div>
    </div>
  )
}

