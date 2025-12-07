# 🏥 Healthcare Scheduler Frontend

Beautiful, modern React frontend for the Healthcare Scheduler application.

## ✨ Features

- **AI-Powered Chat Interface** - Conversational UI with Google Gemini AI
- **Smart Therapist Matching** - Finds therapists based on specialty and insurance
- **Easy Booking** - Simple appointment booking flow
- **Admin Dashboard** - Secure dashboard with Supabase authentication
- **Responsive Design** - Works on all devices
- **Modern UI** - Built with Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Backend deployed and running

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is in use)

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ChatInterface.jsx       # Main chat UI
│   ├── TherapistSelection.jsx  # Therapist cards
│   ├── BookingForm.jsx         # Appointment booking
│   └── AdminDashboard.jsx      # Admin panel
├── lib/
│   └── supabase.js            # API configuration
├── App.jsx                     # Main app with routing
├── main.jsx                   # Entry point
└── index.css                  # Tailwind styles
```

## 🔧 Configuration

The frontend is pre-configured to connect to your Supabase backend:

- **Project URL**: `https://ljxugwfzkbjlrjwpglnx.supabase.co`
- **Anon Key**: Already configured in `.env`

## 🎨 Pages

### Landing Page (`/`)
- Hero section with call-to-action
- Feature highlights
- How it works section

### Chat Interface (`/chat`)
- AI-powered conversation
- Real-time responses
- Automatic therapist matching
- Smooth transitions to booking

### Admin Dashboard (`/admin`)
- Secure login with Supabase Auth
- View all inquiries
- Monitor appointments
- Therapist management

## 🔐 Admin Access

To create an admin account:

1. Go to Supabase Dashboard → Authentication
2. Click "Add User"
3. Create a new user with email/password
4. Use these credentials to log into `/admin`

## 📱 Screenshots

### Chat Interface
Beautiful gradient design with smooth animations

### Therapist Selection
Professional cards with specialty and insurance info

### Booking Form
Simple, intuitive appointment scheduling

### Admin Dashboard
Comprehensive view of all data

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Supabase** - Backend & Auth

## 🌐 API Integration

All API calls are handled through `src/lib/supabase.js`:

- `chatAPI.sendMessage()` - Send chat messages
- `therapistAPI.findTherapist()` - Find matching therapists
- `appointmentAPI.bookAppointment()` - Book appointments
- `adminAPI.getData()` - Get admin dashboard data

## 📦 Available Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## 🎯 Key Features Explained

### Real-time Chat
- Messages stored with conversation history
- Automatic scrolling to latest message
- Loading indicators
- Error handling

### Smart Matching
- AI extracts specialty and insurance from conversation
- Backend finds matching therapists
- Displays match score and details

### Booking Flow
- Select therapist
- Fill in details
- Choose date/time
- Instant confirmation

### Admin Dashboard
- Protected by Supabase Auth
- Real-time data from backend
- View inquiries, appointments, therapists
- Status indicators

## 🚀 Deployment Options

### Vercel (Recommended)

```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Netlify

```bash
npm run build
# Deploy dist/ folder to Netlify
```

### Manual

```bash
npm run build
# Serve dist/ folder with any static host
```

## 🔒 Environment Variables

Required variables in `.env`:

```env
VITE_SUPABASE_URL=https://ljxugwfzkbjlrjwpglnx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 🐛 Troubleshooting

### Port already in use
Vite will automatically try the next available port (5174, 5175, etc.)

### API errors
- Check backend is deployed and running
- Verify environment variables in `.env`
- Check browser console for specific errors

### Styling issues
- Clear browser cache
- Run `npm run build` to rebuild

## 📚 Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com/docs)

## 💡 Next Steps

1. **Customize Styling** - Modify colors in `tailwind.config.js`
2. **Add Features** - Extend components with new functionality
3. **Deploy** - Push to production on Vercel or Netlify
4. **Analytics** - Add tracking for user interactions

## 🎉 Success!

Your frontend is now connected to your backend and ready to use!

- **Chat**: http://localhost:5173/chat
- **Admin**: http://localhost:5173/admin
- **Landing**: http://localhost:5173/

---

Built with ❤️ using React, Tailwind CSS, and Supabase
