import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  alpha
} from "@mui/material";
import {
  Chat as ChatIcon,
  AdminPanelSettings as AdminIcon,
  SmartToy as BotIcon
} from "@mui/icons-material";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          px: 2,
        }}
      >
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(27, 67, 50, 0.3)',
              mx: 'auto',
              mb: 4,
            }}
          >
            <BotIcon sx={{ color: 'white', fontSize: 64 }} />
          </Box>
          
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              mb: 2,
              background: 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
            }}
          >
            Health Scheduler
          </Typography>
          
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              mb: 1,
              fontWeight: 400,
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            AI-Powered Healthcare Scheduling
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            Find the perfect therapist, schedule appointments, and manage your health journey with our intelligent AI assistant.
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 3,
            width: '100%',
            maxWidth: 600,
          }}
        >
          {/* Chat Button */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(27, 67, 50, 0.4)',
              },
            }}
            onClick={() => navigate('/chat')}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <ChatIcon sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Start Chatting
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.9rem',
                }}
              >
                Chat with our AI assistant to find therapists and schedule appointments
              </Typography>
            </Box>
          </Paper>

          {/* Admin Button */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 4,
              borderRadius: 4,
              border: '2px solid',
              borderColor: 'primary.main',
              bgcolor: alpha('#1b4332', 0.05),
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(27, 67, 50, 0.2)',
                bgcolor: alpha('#1b4332', 0.1),
              },
            }}
            onClick={() => navigate('/admin')}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <AdminIcon sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Admin Login
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: '0.9rem',
                }}
              >
                Access the admin dashboard to manage appointments and inquiries
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Features */}
        <Box
          sx={{
            mt: 8,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            justifyContent: 'center',
            maxWidth: 900,
            width: '100%',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 24px)' },
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(27, 67, 50, 0.15)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                mb: 1.5,
                fontSize: '2.5rem',
              }}
            >
              ⚡
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Fast
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quick appointment scheduling
            </Typography>
          </Paper>
          
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 24px)' },
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(27, 67, 50, 0.15)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                mb: 1.5,
                fontSize: '2.5rem',
              }}
            >
              🔒
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Secure
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your data is protected
            </Typography>
          </Paper>
          
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 24px)' },
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(27, 67, 50, 0.15)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                mb: 1.5,
                fontSize: '2.5rem',
              }}
            >
              🤐
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Confidential
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Private and discreet service
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}

