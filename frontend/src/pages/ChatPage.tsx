import ChatWindow from "../components/ChatWindow";
import { Box } from "@mui/material";

export default function ChatPage() {
  return (
    <Box 
      sx={{ 
        width: '100%',
        height: 'calc(100vh - 128px)', // Full height minus header/footer
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        boxSizing: 'border-box',
      }}
    >
      <ChatWindow />
    </Box>
  );
}
