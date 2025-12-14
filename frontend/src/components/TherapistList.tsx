import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Grid,
  CircularProgress,
  Button,
  Card,
  CardContent,
  CardActions,
  alpha
} from "@mui/material";
import { 
  CheckCircle as CheckIcon,
  Link as LinkIcon,
  CalendarMonth as CalendarIcon
} from "@mui/icons-material";

type Therapist = {
  id: string;
  name: string;
  bio: string | null;
  specialties: string[];
  accepted_insurance: string[];
  google_refresh_token: string | null;
  google_calendar_id: string | null;
  is_active: boolean | null;
};

export default function TherapistList() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const fetchTherapists = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('therapists')
        .select('id, name, bio, specialties, accepted_insurance, google_refresh_token, google_calendar_id, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setTherapists(data || []);
    } catch (err) {
      console.error("Error fetching therapists:", err);
      setTherapists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTherapists();
  }, []);

  const handleConnectCalendar = (therapistId: string) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!clientId) {
      alert("Configuration Error: VITE_GOOGLE_CLIENT_ID is missing in your frontend .env file.");
      return;
    }

    if (!supabaseUrl) {
      alert("Configuration Error: VITE_SUPABASE_URL is missing in your frontend .env file.");
      return;
    }

    setConnectingId(therapistId);

    // Redirect to the Supabase Edge Function
    const redirectUri = `${supabaseUrl}/functions/v1/google-callback`;
    const scope = 'https://www.googleapis.com/auth/calendar.events';

    // Pass therapist ID as state
    const state = therapistId;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;

    window.location.href = authUrl;
  };

  const handleDisconnectCalendar = async (therapistId: string) => {
    if (!confirm("Disconnect calendar for this therapist?")) return;

    try {
      const { error } = await supabase
        .from('therapists')
        .update({ google_refresh_token: null })
        .eq('id', therapistId);

      if (error) throw error;
      
      // Refresh the list
      fetchTherapists();
      alert("Calendar disconnected successfully!");
    } catch (err: any) {
      console.error("Disconnect error:", err);
      alert("Failed to disconnect: " + err.message);
    }
  };

  // Handle successful OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const therapistId = params.get('state'); // We use state to pass therapist ID

    if (success === 'true' && therapistId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert("Calendar connected successfully!");
      setConnectingId(null);
      fetchTherapists();
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (therapists.length === 0) {
    return (
      <Typography color="text.secondary">No therapists found.</Typography>
    );
  }

  return (
    <Grid container spacing={3}>
      {therapists.map((therapist) => {
        const isConnected = !!therapist.google_refresh_token;
        
        return (
          <Grid item xs={12} sm={6} md={4} key={therapist.id}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                background: isConnected
                  ? `linear-gradient(135deg, ${alpha('#1e8e3e', 0.03)} 0%, ${alpha('#34a853', 0.03)} 100%)`
                  : 'white',
                border: '1px solid',
                borderColor: isConnected ? alpha('#1e8e3e', 0.2) : alpha('#1b4332', 0.1),
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: '0px 8px 20px rgba(60, 64, 67, 0.15)',
                  transform: 'translateY(-2px)',
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                {/* Header with name and status */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'primary.main',
                      flex: 1,
                    }}
                  >
                    {therapist.name}
                  </Typography>
                  {isConnected && (
                    <Chip
                      icon={<CheckIcon />}
                      label="Connected"
                      color="success"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>

                {/* Bio */}
                {therapist.bio && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      mb: 2,
                      lineHeight: 1.6,
                    }}
                  >
                    {therapist.bio}
                  </Typography>
                )}

                {/* Specialties */}
                {therapist.specialties && therapist.specialties.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      Specialties:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {therapist.specialties.slice(0, 3).map((spec, idx) => (
                        <Chip
                          key={idx}
                          label={spec}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                      {therapist.specialties.length > 3 && (
                        <Chip
                          label={`+${therapist.specialties.length - 3} more`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                    </Box>
                  </Box>
                )}

                {/* Insurance */}
                {therapist.accepted_insurance && therapist.accepted_insurance.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      Insurance:
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {therapist.accepted_insurance.slice(0, 3).join(', ')}
                      {therapist.accepted_insurance.length > 3 && ` +${therapist.accepted_insurance.length - 3} more`}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              {/* Calendar Connection Action */}
              <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
                {isConnected ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleDisconnectCalendar(therapist.id)}
                    fullWidth
                    startIcon={<LinkIcon />}
                  >
                    Disconnect Calendar
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleConnectCalendar(therapist.id)}
                    disabled={connectingId === therapist.id}
                    fullWidth
                    startIcon={<CalendarIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #081c15 0%, #1b4332 100%)',
                      }
                    }}
                  >
                    {connectingId === therapist.id ? 'Connecting...' : 'Connect Calendar'}
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

