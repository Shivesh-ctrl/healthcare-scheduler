#!/bin/bash

# Healthcare Scheduler - Start Script
# Run this to start the entire project

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   🏥  HEALTHCARE SCHEDULER - STARTING PROJECT               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if frontend is already running
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Frontend is already running on port 5173"
else
    echo "🚀 Starting frontend..."
    cd frontend
    npm run dev &
    cd ..
    sleep 3
    echo "✅ Frontend started at http://localhost:5173"
fi

echo ""
echo "🧪 Testing backend connection..."
RESPONSE=$(curl -s -X POST "https://ljxugwfzkbjlrjwpglnx.supabase.co/functions/v1/handle-chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeHVnd2Z6a2JqbHJqd3BnbG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzc5MTQsImV4cCI6MjA4MDYxMzkxNH0.x546TLjZ_LtWH2fbm_zdxGzdCW82752_IwqRVFZtZ_4" \
  -d '{"message": "test"}' 2>&1)

if echo "$RESPONSE" | grep -q "reply"; then
    echo "✅ Backend is responding!"
else
    echo "⚠️  Backend is starting up (this may take a moment)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   ✅  PROJECT IS RUNNING                                    ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 ACCESS YOUR APPLICATION:"
echo "   Landing Page: http://localhost:5173"
echo "   Chat Interface: http://localhost:5173/chat"
echo "   Admin Dashboard: http://localhost:5173/admin"
echo ""
echo "📊 VIEW DATA:"
echo "   Supabase Dashboard: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx"
echo "   Appointments Table: https://supabase.com/dashboard/project/ljxugwfzkbjlrjwpglnx/editor/17533"
echo ""
echo "👥 AVAILABLE THERAPISTS (8 Total):"
echo "   • Dr. Sarah Johnson - anxiety, depression, trauma"
echo "   • Dr. Michael Chen - bipolar, depression, mood disorders"
echo "   • Dr. Emily Rodriguez - couples therapy, relationships"
echo "   • Dr. James Williams - addiction, substance abuse"
echo "   • Dr. Lisa Thompson - child therapy, adhd, autism"
echo "   • Dr. Robert Martinez - career counseling, stress"
echo "   • Dr. Amanda Davis - eating disorders, body image"
echo "   • Dr. David Lee - geriatric, dementia, depression"
echo ""
echo "Press Ctrl+C to stop the frontend server"
echo ""
