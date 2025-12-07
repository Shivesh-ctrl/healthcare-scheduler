import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import ChatInterface from './components/ChatInterface'
import AdminDashboard from './components/AdminDashboard'
import OAuthCallback from './components/OAuthCallback'
import { Home, Shield, MessageCircle } from 'lucide-react'

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="bg-gradient-to-r from-green-800 to-green-900 p-6 rounded-2xl w-fit mx-auto mb-6 shadow-lg">
            <MessageCircle className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Healthcare Scheduler
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Find the perfect therapist for your mental health needs
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/chat"
              className="bg-gradient-to-r from-green-800 to-green-900 text-white rounded-xl px-8 py-4 font-semibold text-lg hover:shadow-lg hover:from-green-900 hover:to-green-950 transition-all flex items-center gap-2 shadow-md"
            >
              <MessageCircle className="w-6 h-6" />
              Start Chat
            </Link>
            <Link
              to="/admin"
              className="bg-white text-gray-800 border-2 border-gray-300 rounded-xl px-8 py-4 font-semibold text-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Shield className="w-6 h-6" />
              Admin Login
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
              <MessageCircle className="w-8 h-8 text-green-800" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">AI-Powered Chat</h3>
            <p className="text-gray-600">
              Have a conversation with our AI assistant to understand your needs
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
              <Home className="w-8 h-8 text-green-800" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Smart Matching</h3>
            <p className="text-gray-600">
              Get matched with therapists based on your specialty and insurance
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
              <Shield className="w-8 h-8 text-green-800" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Easy Booking</h3>
            <p className="text-gray-600">
              Book appointments instantly with your preferred therapist
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-800 to-green-900 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg shadow-md">
                1
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Start Chat</h4>
              <p className="text-sm text-gray-600">Tell us about your concerns</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-800 to-green-900 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg shadow-md">
                2
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Get Matched</h4>
              <p className="text-sm text-gray-600">AI finds the best therapists</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-800 to-green-900 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg shadow-md">
                3
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Choose Provider</h4>
              <p className="text-sm text-gray-600">Select your preferred therapist</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-800 to-green-900 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg shadow-md">
                4
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Book Appointment</h4>
              <p className="text-sm text-gray-600">Schedule your session</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-600">
          <p className="text-sm">
            © 2025 Healthcare Scheduler. All rights reserved.
          </p>
          <p className="text-xs mt-2">
            Powered by Supabase & Google Gemini AI
          </p>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
      </Routes>
    </Router>
  )
}

