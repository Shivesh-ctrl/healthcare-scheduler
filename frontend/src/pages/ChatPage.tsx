import ChatWindow from "../components/ChatWindow";
import { Box } from "@mui/material";

export default function ChatPage() {
  return (
    <Box 
      sx={{ 
        width: '100%',
        height: 'calc(100vh - 64px)', // Full height minus header only
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        boxSizing: 'border-box',
        overflow: 'hidden', // Prevent page scrolling
      }}
    >
      <ChatWindow />
    </Box>
  );
}
