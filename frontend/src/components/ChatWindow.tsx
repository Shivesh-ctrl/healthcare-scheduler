import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Box,
  TextField,
  Paper,
  Typography,
  Avatar,
  CircularProgress,
  IconButton
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";

type Message = { sender: "user" | "bot"; text: string };

// Send sound (pop) - for user messages
const playSendSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Quick pop sound (lower pitch, short)
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.08);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log("Audio not supported");
  }
};

// Receive sound (WhatsApp-like ting) - for bot messages
const playReceiveSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // First note (lower)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);

    osc1.frequency.setValueAtTime(830, audioContext.currentTime); // G#5
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.15);

    // Second note (higher) - slight delay for ting effect
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);

    osc2.frequency.setValueAtTime(1046, audioContext.currentTime + 0.08); // C6
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, audioContext.currentTime);
    gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

    osc2.start(audioContext.currentTime + 0.08);
    osc2.stop(audioContext.currentTime + 0.25);
  } catch (e) {
    console.log("Audio not supported");
  }
};

// Legacy function name for backward compatibility
const playPopSound = playReceiveSound;

// Format message text with bold, bullet points, and proper formatting
const formatMessage = (text: string) => {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentParagraph: string[] = [];
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join(' ');
      elements.push(
        <Box key={elements.length} component="div" sx={{ mb: 1.5, lineHeight: 1.7 }}>
          {formatBoldText(paragraphText)}
        </Box>
      );
      currentParagraph = [];
    }
  };
  
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // Check if it's a numbered list item (1. 2. 3. etc.)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      elements.push(
        <Box key={elements.length} component="div" sx={{ mb: 1.5, display: 'flex', alignItems: 'flex-start' }}>
          <Box component="span" sx={{ fontWeight: 700, mr: 1.5, minWidth: '24px' }}>
            {numberedMatch[1]}.
          </Box>
          <Box component="span" sx={{ flex: 1 }}>
            {formatBoldText(numberedMatch[2])}
          </Box>
        </Box>
      );
      return;
    }
    
    // Check if it's a bullet point (- or •)
    if (trimmed.match(/^[-•]\s+/)) {
      flushParagraph();
      const content = trimmed.replace(/^[-•]\s+/, '');
      elements.push(
        <Box key={elements.length} component="div" sx={{ mb: 1, pl: 2, position: 'relative' }}>
          <Box component="span" sx={{ position: 'absolute', left: 0, fontWeight: 600 }}>•</Box>
          <Box component="span">
            {formatBoldText(content)}
          </Box>
        </Box>
      );
      return;
    }
    
    // Empty line - flush current paragraph
    if (trimmed === '') {
      flushParagraph();
      return;
    }
    
    // Regular text - add to current paragraph
    currentParagraph.push(trimmed);
  });
  
  // Flush any remaining paragraph
  flushParagraph();
  
  return (
    <Box component="div">
      {elements}
    </Box>
  );
};

// Format bold text (**text**)
const formatBoldText = (text: string) => {
  const parts: (string | JSX.Element)[] = [];
  let currentIndex = 0;
  const boldRegex = /\*\*(.+?)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before bold
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }
    // Add bold text
    parts.push(
      <Box key={match.index} component="span" sx={{ fontWeight: 700 }}>
        {match[1]}
      </Box>
    );
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hi there! 👋 I'm Omi, your friendly AI assistant. I'm here to help you find the perfect therapist and schedule appointments. I know reaching out can feel like a big step, and I'm here to make it easier. What brings you here today?" }
  ]);
  // Use a random ID per session for demo purposes, ensuring a fresh conversation on refresh
  const [patientId] = useState(`anon-${Math.random().toString(36).substring(7)}`);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const [matchedTherapistId, setMatchedTherapistId] = useState<string | null>(null);
  const [pendingTherapistMatches, setPendingTherapistMatches] = useState<any[] | null>(null);

  const sendToHandleChat = async (text: string, currentMatchedId: string | null) => {
    // Build conversation history from messages
    const conversationHistory = messages.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    const { data, error } = await supabase.functions.invoke('handle-chat', {
      body: {
        userMessage: text,
        patientId: patientId,
        matchedTherapistId: currentMatchedId,
        pendingTherapistMatches: pendingTherapistMatches,
        conversationHistory: conversationHistory
      }
    });

    if (error) {
      console.error("Function error:", error);
      throw new Error(error.message || "Failed to process message");
    }

    return data;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    playSendSound(); // Play pop sound when user sends message
    setLoading(true);

    try {
      const data: any = await sendToHandleChat(userMsg, matchedTherapistId);

      // Use the AI-generated conversational response
      const reply = data?.aiResponse || data?.message || "I processed that, but didn't get a specific response.";

      // Debugging: Log the extracted data to console
      if (data?.extractedData) {
        console.log("AI Extracted:", data.extractedData);
      }

      setMessages(prev => [...prev, { sender: "bot", text: reply }]);
      playPopSound(); // Play pop sound when bot responds

      // --- Handle therapist selection ---
      if (data?.nextAction === 'therapist-selected' && data.therapistId) {
        setMatchedTherapistId(data.therapistId);
        setPendingTherapistMatches(null); // Clear pending matches
        // AI response already included in 'reply' - no need for duplicate message
      }

      // --- Orchestration Logic ---
      if (data?.nextAction === 'find-therapist' && data.inquiryId) {
        setMessages(prev => [...prev, { sender: 'bot', text: "Thank you. I'm looking for therapists who can best support you..." }]);
        playPopSound();

        const { data: findData, error: findError } = await supabase.functions.invoke('find-therapist', {
          body: { inquiryId: data.inquiryId, limit: 3 }
        });

        if (findError) {
          console.error(findError);
          setMessages(prev => [...prev, { sender: 'bot', text: "I encountered an error searching for therapists." }]);
          playPopSound();
        } else if (findData.matches && findData.matches.length > 0) {
          // Store matches for potential selection
          const therapistOptions = findData.matches.map((m: any) => ({
            id: m.therapist.id,
            name: m.therapist.name,
            specialties: m.therapist.specialties,
            accepted_insurance: m.therapist.accepted_insurance,
            bio: m.therapist.bio
          }));
          setPendingTherapistMatches(therapistOptions);

          // Show all matches with details
          let matchesText = "I've found some thoughtful matches for you:\n\n";
          findData.matches.forEach((match: any, index: number) => {
            const t = match.therapist;
            const specialtiesStr = Array.isArray(t.specialties) ? t.specialties.slice(0, 3).join(", ") : "Multiple areas";
            const insuranceStr = Array.isArray(t.accepted_insurance) ? t.accepted_insurance.slice(0, 2).join(", ") : "Various providers";

            matchesText += `${index + 1}. ${t.name}\n`;
            matchesText += `   • Specialties: ${specialtiesStr}\n`;
            matchesText += `   • Accepts: ${insuranceStr}\n`;
            if (t.bio) {
              const shortBio = t.bio.substring(0, 100) + (t.bio.length > 100 ? "..." : "");
              matchesText += `   • About: ${shortBio}\n`;
            }
            matchesText += "\n";
          });

          matchesText += "Does one of these stand out to you? Let me know which one you prefer (e.g., '1' or 'the first one').";

          setMessages(prev => [...prev, {
            sender: 'bot',
            text: matchesText
          }]);
          playPopSound();
        } else {
          setMessages(prev => [...prev, { sender: 'bot', text: "I couldn't find any therapists matching your specific criteria right now. Would you like to adjust your requirements?" }]);
          playPopSound();
        }
      }

      if (data?.nextAction === 'book-appointment' && data.therapistId && data.startTime) {
        setMessages(prev => [...prev, { sender: 'bot', text: "Wonderful. I'm securing that time for you..." }]);
        playPopSound();

        const { data: bookData, error: bookError } = await supabase.functions.invoke('book-appointment', {
          body: {
            inquiryId: data.inquiryId,
            therapistId: data.therapistId,
            startTime: data.startTime,
            endTime: data.endTime,
            patientName: "Guest Patient",
            timeZone: data.timeZone || 'Asia/Kolkata'
          }
        });

        if (bookError) {
          setMessages(prev => [...prev, { sender: 'bot', text: `I had trouble booking that appointment: ${bookError.message}. Could you try a different time?` }]);
          playPopSound();
        } else {
          const appointmentDate = new Date(data.startTime);
          const dateOptions: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          };
          const dateStr = appointmentDate.toLocaleDateString('en-US', dateOptions);

          let confirmMessage = `✅ All set! Your appointment is confirmed for:\n\n${dateStr}\n\n`;

          if (bookData?.googleCalendarError) {
            confirmMessage += `⚠️ Note: The appointment was saved, but there was an issue syncing with the therapist's Google Calendar. They'll still see your appointment in our system.`;
          } else {
            confirmMessage += `📧 A calendar invite has been sent to your therapist. Looking forward to your session!`;
          }

          setMessages(prev => [...prev, { sender: 'bot', text: confirmMessage }]);
          playPopSound();

          // Clear state after successful booking
          setMatchedTherapistId(null);
          setPendingTherapistMatches(null);
        }
      }

    } catch (err: any) {
      setMessages(prev => [...prev, { sender: "bot", text: "I'm having a bit of trouble connecting right now. Could you try that again?" }]);
      playPopSound();
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <Paper
      elevation={3}
      sx={{
        width: '100%',
        maxWidth: 1200,
        height: 900,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 4,
        bgcolor: 'background.paper',
        boxShadow: '0px 8px 24px rgba(27, 67, 50, 0.15), 0px 2px 6px rgba(27, 67, 50, 0.1)',
        transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0px 12px 32px rgba(27, 67, 50, 0.2), 0px 4px 8px rgba(27, 67, 50, 0.15)',
        }
      }}
    >
      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
          position: 'relative',
          // Custom scrollbar styling
          '&::-webkit-scrollbar': {
            width: '10px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#bdc1c6',
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: '#9aa0a6',
            },
          },
        }}
      >
        {/* Hero Section Inside Chat Box */}
        <Box 
          sx={{ 
            textAlign: 'center',
            mb: 3,
            position: 'relative',
          }}
        >
          {/* Main Heading */}
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 700,
              color: 'text.primary',
              mb: 1.5,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              lineHeight: 1.2,
            }}
          >
            How can we{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              help you
            </Box>
            {' '}today?
          </Typography>

          {/* Subtitle */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              mb: 1,
            }}
          >
            Chat with our intelligent AI assistant to schedule therapy appointments,
            check availability, or ask about insurance coverage.
          </Typography>

          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              display: 'block',
              fontSize: '0.8125rem',
            }}
          >
            Fast • Secure • Confidential
          </Typography>
        </Box>

        {messages.map((m, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
              alignItems: 'flex-end',
              gap: 1.5,
              animation: 'fadeInUp 0.3s ease-out',
              '@keyframes fadeInUp': {
                from: {
                  opacity: 0,
                  transform: 'translateY(10px)',
                },
                to: {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            {m.sender === "bot" && (
              <Avatar
                sx={{
                  background: 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)',
                  width: 44,
                  height: 44,
                  boxShadow: '0 2px 8px rgba(27, 67, 50, 0.3)',
                }}
              >
                <SmartToyIcon />
              </Avatar>
            )}

            <Paper
              elevation={0}
              sx={{
                p: 3,
                maxWidth: '80%',
                borderRadius: 4,
                borderBottomLeftRadius: m.sender === "bot" ? 4 : 4,
                borderBottomRightRadius: m.sender === "user" ? 4 : 4,
                bgcolor: m.sender === "user"
                  ? 'primary.main'
                  : 'white',
                background: m.sender === "user"
                  ? 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)'
                  : 'white',
                color: m.sender === "user" ? 'white' : 'text.primary',
                boxShadow: m.sender === "bot"
                  ? '0px 2px 8px rgba(27, 67, 50, 0.1)'
                  : '0px 2px 8px rgba(27, 67, 50, 0.25)',
                border: m.sender === "bot" ? '1px solid' : 'none',
                borderColor: m.sender === "bot" ? 'rgba(27, 67, 50, 0.1)' : 'transparent',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: m.sender === "bot"
                    ? '0px 4px 12px rgba(27, 67, 50, 0.15)'
                    : '0px 4px 12px rgba(27, 67, 50, 0.35)',
                }
              }}
            >
              <Typography
                variant="body1"
                component="div"
                sx={{
                  lineHeight: 1.7,
                  fontSize: '1rem',
                  fontWeight: m.sender === "bot" ? 400 : 500,
                }}
              >
                {m.sender === "bot" ? formatMessage(m.text) : m.text}
              </Typography>
            </Paper>

            {m.sender === "user" && (
              <Avatar
                sx={{
                  bgcolor: '#40916c',
                  width: 44,
                  height: 44,
                  boxShadow: '0 2px 6px rgba(64, 145, 108, 0.3)',
                }}
              >
                <PersonIcon />
              </Avatar>
            )}
          </Box>
        ))}
        {loading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 1.5,
              animation: 'fadeInUp 0.3s ease-out',
            }}
          >
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)',
                width: 44,
                height: 44,
                boxShadow: '0 2px 8px rgba(27, 67, 50, 0.3)',
              }}
            >
              <SmartToyIcon />
            </Avatar>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                borderBottomLeftRadius: 4,
                bgcolor: 'white',
                border: '1px solid',
                borderColor: 'rgba(27, 67, 50, 0.1)',
                boxShadow: '0px 2px 8px rgba(27, 67, 50, 0.1)',
              }}
            >
              <CircularProgress size={24} thickness={4} />
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          p: 4,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid',
          borderColor: 'rgba(27, 67, 50, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            autoFocus
            inputRef={inputRef}
            variant="outlined"
            placeholder="Type your message here... 💬"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading) handleSend();
              }
            }}
            multiline
            maxRows={5}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#f8f9fa',
                borderRadius: '16px',
                fontSize: '1.125rem',
                padding: '12px 16px',
                minHeight: '56px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: '#f1f3f4',
                },
                '&.Mui-focused': {
                  bgcolor: 'white',
                  boxShadow: '0 0 0 3px rgba(27, 67, 50, 0.1)',
                }
              },
              '& .MuiInputBase-input': {
                padding: '0 !important',
                fontSize: '1.125rem',
                lineHeight: 1.5,
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            sx={{
              width: 56,
              height: 56,
              background: input.trim()
                ? 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)'
                : '#e8eaed',
              color: input.trim() ? 'white' : '#9aa0a6',
              boxShadow: input.trim()
                ? '0 2px 8px rgba(27, 67, 50, 0.3)'
                : 'none',
              '&:hover': {
                background: input.trim()
                  ? 'linear-gradient(135deg, #081c15 0%, #1b4332 100%)'
                  : '#e8eaed',
                transform: input.trim() ? 'translateY(-2px) scale(1.05)' : 'none',
                boxShadow: input.trim()
                  ? '0 4px 12px rgba(27, 67, 50, 0.4)'
                  : 'none',
              },
              '&:active': {
                transform: 'translateY(0) scale(1)',
              },
              '&.Mui-disabled': {
                background: '#e8eaed',
                color: '#bdc1c6',
              },
              borderRadius: '16px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
        <Typography
          variant="caption"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            mt: 2,
            color: 'text.secondary',
            fontSize: '0.8125rem',
          }}
        >
          <Box component="span" sx={{ fontSize: '1.1rem' }}>✨</Box>
          AI can make mistakes. Please verify important information.
        </Typography>
      </Box>
    </Paper>
  );
}