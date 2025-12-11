import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Send, Bot, User, Loader, Home, LogIn, UserPlus, MessageCircle } from 'lucide-react'
import { chatAPI, supabase } from '../lib/supabase'
import TherapistSelection from './TherapistSelection'
import MarkdownText from './MarkdownText'
import type { ConversationMessage, Therapist, Session } from '../lib/types'

export default function ChatInterface() {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m here to help you find the right therapist for your needs. Taking this step shows courage, and I\'m here to support you through the process.\n\nI can help you:\n• Find a therapist who matches your needs\n• **Book your appointment directly** through this system\n• Get everything scheduled in one place\n\nTo get started, I\'d like to learn a bit about:\n• What brings you here today\n• Your **insurance provider**\n• Your **scheduling preferences**\n\nCan you tell me what\'s on your mind?',
      timestamp: new Date().toISOString()
    }
  ])
  const [inputMessage, setInputMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [inquiryId, setInquiryId] = useState<string | null>(null)
  const [matchedTherapists, setMatchedTherapists] = useState<Therapist[] | null>(null)
  const [extractedInfo, setExtractedInfo] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check authentication
  useEffect(() => {
    // Handle email confirmation callback from URL hash
    const handleEmailConfirmation = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (type === 'signup' || type === 'email_change' || (accessToken && refreshToken)) {
        try {
          const { data: { session: newSession }, error } = await supabase.auth.setSession({
            access_token: accessToken || '',
            refresh_token: refreshToken || '',
          })

          if (!error && newSession) {
            setSession(newSession as Session)
            window.history.replaceState(null, '', window.location.pathname)
          }
        } catch (err) {
          console.error('Error handling email confirmation:', err)
        }
      }
    }

    handleEmailConfirmation()

    // Function to ensure user record exists in database
    const ensureUserRecord = async (session: Session | null) => {
      if (!session?.user) return

      try {
        // Try to get user record
        const { data: existingUser, error: fetchError } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        // If user doesn't exist (404 or PGRST116), create it
        if (fetchError && (fetchError.code === 'PGRST116' || fetchError.code === '42P01' || fetchError.message?.includes('404'))) {
          console.log('ℹ️  Patient record not found, creating...')
          const { error: insertError } = await supabase
            .from('patients')
            .insert({
              user_id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email || '',
            })

          if (insertError) {
            console.error('Error creating user record:', insertError)
            // Don't throw - this is not critical, user can still use the app
          } else {
            console.log('✅ User record created in database')
          }
        } else if (fetchError) {
          // Log but don't block - RLS might be preventing access, but user can still use app
          console.warn('⚠️  Could not check user record (this is OK if RLS is enabled):', fetchError.message)
        } else {
          console.log('✅ User record already exists')
        }
      } catch (err) {
        // Don't throw - this is not critical
        console.warn('⚠️  Error ensuring user record (non-critical):', err)
      }
    }

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        setSession(session as Session)
        // Ensure user record exists
        if (session) {
          await ensureUserRecord(session as Session)
        } else {
          // Redirect to login if not authenticated
          navigate('/login')
        }
      } catch (err) {
        console.error('Error in auth check:', err)
        // Continue anyway - user can still use the app
      } finally {
        // Always set checkingAuth to false, even if there's an error
        setCheckingAuth(false)
      }
    }).catch((err) => {
      console.error('Critical error getting session:', err)
      // Set checkingAuth to false so user sees content
      setCheckingAuth(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session as Session)
        // Ensure user record exists
        if (session) {
          await ensureUserRecord(session as Session)
        } else {
          // Redirect to login if not authenticated
          navigate('/login')
        }
      } catch (err) {
        console.error('Error in auth state change:', err)
        // Continue anyway - user can still use the app
      } finally {
        // Always set checkingAuth to false, even if there's an error
        setCheckingAuth(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ConversationMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await chatAPI.sendMessage(
        inputMessage,
        inquiryId,
        messages.filter(m => m.role !== 'system')
      )

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])
      
      if (response.inquiryId) {
        setInquiryId(response.inquiryId)
      }

      if (response.matchedTherapists && response.matchedTherapists.length > 0) {
        setMatchedTherapists(response.matchedTherapists)
        if (response.extractedInfo) {
          setExtractedInfo(response.extractedInfo)
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      
      // Get more detailed error message if available
      let errorContent = 'Sorry, I encountered an error. Please try again.'
      if (error?.message) {
        // Show user-friendly error message
        errorContent = `Sorry, I encountered an error: ${error.message}`
        
        // Add helpful suggestions for common errors
        if (error.message.includes('Failed to connect') || error.message.includes('Failed to fetch')) {
          errorContent += '\n\nPlease check your internet connection and try again.'
        } else if (error.message.includes('timeout')) {
          errorContent += '\n\nThe server is taking longer than usual. Please try again in a moment.'
        }
      }
      
      const errorMessage: ConversationMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-green-800" />
      </div>
    )
  }

  // Redirect to login page if not authenticated (handled by useEffect above)
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Loader className="w-12 h-12 animate-spin text-green-800 mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  if (matchedTherapists && matchedTherapists.length > 0) {
    return (
      <TherapistSelection 
        therapists={matchedTherapists} 
        inquiryId={inquiryId}
        extractedInfo={extractedInfo}
        onBack={() => {
          setMatchedTherapists(null)
          setExtractedInfo(null)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-800 to-green-900 p-3 rounded-xl shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Healthcare Scheduler</h1>
              <p className="text-sm text-gray-500">Find your perfect therapist</p>
            </div>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 font-semibold hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="bg-gradient-to-r from-green-800 to-green-900 p-2 rounded-full h-fit shadow-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[70%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-green-800 to-green-900 text-white shadow-md'
                    : 'bg-gray-50 text-gray-800 border border-gray-100'
                }`}
              >
                {message.role === 'assistant' ? (
                  <MarkdownText 
                    content={message.content} 
                    className="prose prose-sm max-w-none"
                  />
                ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-green-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="bg-gradient-to-r from-green-700 to-green-800 p-2 rounded-full h-fit shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-gradient-to-r from-green-800 to-green-900 p-2 rounded-full h-fit shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <Loader className="w-5 h-5 animate-spin text-green-800" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="bg-white rounded-b-2xl shadow-lg p-6 border-t border-gray-100">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-green-800 to-green-900 text-white rounded-xl px-6 py-3 font-semibold hover:shadow-lg hover:from-green-900 hover:to-green-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

