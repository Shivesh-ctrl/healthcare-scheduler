import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import AdminLoginPassword from "../components/AdminLoginPassword";
import InquiryList from "../components/InquiryList";
import AppointmentList from "../components/AppointmentList";
import TherapistList from "../components/TherapistList";
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Container, 
  Chip,
  alpha
} from "@mui/material";
import { 
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckIcon,
  Link as LinkIcon,
  Logout as LogoutIcon,
  People as PeopleIcon
} from "@mui/icons-material";

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [therapist, setTherapist] = useState<any>(null);

  async function getAdminData() {
    if (!session) return;
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-data');
      if (error) throw error;

      // Update therapist state if returned
      if (data && data.therapist && data.therapist.length > 0) {
        setTherapist(data.therapist[0]);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  }

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      getAdminData();
    }
  }, [session]);


  if (!session) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 5, 
              textAlign: 'center',
              borderRadius: 4,
              boxShadow: '0px 8px 24px rgba(60, 64, 67, 0.15)',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)',
                mx: 'auto',
                mb: 3,
              }}
            >
              <CalendarIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                fontWeight: 700,
                mb: 1,
              }}
            >
              Admin Dashboard
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ mb: 4 }}
            >
              Sign in to manage appointments and patient inquiries
            </Typography>
            <AdminLoginPassword />
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          pb: 3,
          borderBottom: '2px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              mb: 0.5,
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your appointments and patient inquiries
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
          sx={{
            borderRadius: '24px',
          }}
        >
          Logout
        </Button>
      </Box>

      {/* Scheduled Appointments */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 4,
          mb: 4,
          borderRadius: 3,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0px 8px 20px rgba(60, 64, 67, 0.15)',
          }
        }}
      >
        <Typography 
          variant="h5" 
          gutterBottom 
          sx={{ 
            color: 'primary.main',
            fontWeight: 600,
            mb: 3,
          }}
        >
          Scheduled Appointments
        </Typography>
        <AppointmentList />
      </Paper>

      {/* Patient Inquiries */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 4,
          borderRadius: 3,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0px 8px 20px rgba(60, 64, 67, 0.15)',
          }
        }}
      >
        <Typography 
          variant="h5" 
          gutterBottom 
          sx={{ 
            color: 'primary.main',
            fontWeight: 600,
            mb: 3,
          }}
        >
          Patient Inquiries
        </Typography>
        <InquiryList />
      </Paper>
    </Box>
  );
}
