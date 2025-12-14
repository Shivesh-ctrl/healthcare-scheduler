import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Chip,
  IconButton,
  Tooltip
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
    <TableContainer component={Box} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table sx={{ minWidth: 650 }} aria-label="therapists table">
        <TableHead sx={{ bgcolor: 'background.default' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Bio</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Specialties</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Insurance</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Calendar Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {therapists.map((therapist) => {
            const isConnected = !!therapist.google_refresh_token;
            
            return (
              <TableRow 
                key={therapist.id} 
                sx={{ 
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  }
                }}
              >
                <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                  {therapist.name}
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {therapist.bio || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {therapist.specialties && therapist.specialties.length > 0 ? (
                    <Typography variant="body2">
                      {therapist.specialties.slice(0, 3).join(', ')}
                      {therapist.specialties.length > 3 && ` (+${therapist.specialties.length - 3})`}
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {therapist.accepted_insurance && therapist.accepted_insurance.length > 0 ? (
                    <Typography variant="body2">
                      {therapist.accepted_insurance.slice(0, 2).join(', ')}
                      {therapist.accepted_insurance.length > 2 && ` (+${therapist.accepted_insurance.length - 2})`}
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {isConnected ? (
                    <Chip
                      icon={<CheckIcon />}
                      label="Connected"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Not Connected"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  {isConnected ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDisconnectCalendar(therapist.id)}
                      startIcon={<LinkIcon />}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleConnectCalendar(therapist.id)}
                      disabled={connectingId === therapist.id}
                      startIcon={<CalendarIcon />}
                      sx={{
                        background: 'linear-gradient(135deg, #1b4332 0%, #40916c 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #081c15 0%, #1b4332 100%)',
                        }
                      }}
                    >
                      {connectingId === therapist.id ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

