import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Box,
  Typography,
  IconButton,
  Tooltip
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";

type Appointment = {
  id: string;
  inquiry_id?: string | null;
  therapist_id?: string | null;
  patient_identifier?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  google_calendar_event_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  therapist_name?: string | null;
  therapists?: {
    name?: string | null;
  } | null;
};

// Helper function to format dates in the user's local timezone
// The ISO string from database is in UTC, we need to display it in IST
const formatDateTime = (isoString: string | null | undefined): string => {
  if (!isoString) return "-";
  
  try {
    // Parse the UTC ISO string - this creates a Date object correctly
    const date = new Date(isoString);
    
    // Verify the date is valid
    if (isNaN(date.getTime())) {
      return isoString;
    }
    
    // Format in India Standard Time (IST)
    // The Date object internally stores UTC time, toLocaleString converts it to the specified timezone
    const formatted = date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    
    return formatted;
  } catch (error) {
    console.error("Error formatting date:", error, isoString);
    return isoString;
  }
};

export default function AppointmentList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-data', {
        method: "GET"
      });

      if (error) {
        console.error("Error fetching appointments:", error);
        setAppointments([]);
        return;
      }

      setAppointments(data.appointments ?? []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("Cancel this appointment? This will delete the event from the therapist's calendar.")) return;
    setActionLoadingId(appointmentId);

    try {
      const { data, error } = await supabase.functions.invoke('cancel-appointment', {
        body: { appointmentId },
      });

      if (error) {
        throw new Error(error.message || "Failed to cancel appointment");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to cancel appointment");
      }

      await fetchAppointments();
      alert("Appointment cancelled successfully");
    } catch (err: any) {
      console.error("Cancel failed:", err);
      alert("Failed to cancel appointment: " + (err.message ?? err));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchAppointments}
          disabled={loading}
          variant="outlined"
          size="small"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </Box>

      {loading && appointments.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : appointments.length === 0 ? (
        <Typography color="text.secondary">No appointments found.</Typography>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table sx={{ minWidth: 650 }} aria-label="appointments table">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
                <TableCell>Therapist</TableCell>
                <TableCell>Patient ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appointments.map((a: any) => (
                <TableRow key={a.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{formatDateTime(a.start_time)}</TableCell>
                  <TableCell>{formatDateTime(a.end_time)}</TableCell>
                  <TableCell>{(a.therapists?.name) ?? a.therapist_name ?? a.therapist_id ?? "-"}</TableCell>
                  <TableCell>{a.patient_identifier ?? "-"}</TableCell>
                  <TableCell>{a.status ?? "-"}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Calendar Event">
                      <IconButton
                        onClick={() => {
                          let url = "https://calendar.google.com";
                          
                          if (a.start_time) {
                            const eventDate = new Date(a.start_time);
                            const year = eventDate.getFullYear();
                            const month = String(eventDate.getMonth() + 1).padStart(2, '0');
                            const day = String(eventDate.getDate()).padStart(2, '0');
                            url = `https://calendar.google.com/calendar/r/day/${year}/${month}/${day}`;
                          }
                          
                          // Use simple window.open without extra parameters
                          window.open(url, "_blank");
                        }}
                        size="small"
                        color="primary"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel Appointment">
                      <IconButton
                        onClick={() => handleCancel(a.id)}
                        disabled={actionLoadingId === a.id}
                        size="small"
                        color="error"
                      >
                        {actionLoadingId === a.id ? <CircularProgress size={20} /> : <DeleteIcon />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
