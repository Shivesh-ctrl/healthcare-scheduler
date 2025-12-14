import ChatWindow from "../components/ChatWindow";
import { Box, Container } from "@mui/material";

export default function ChatPage() {
  return (
    <Container maxWidth="lg">
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: 'calc(100vh - 200px)',
          py: 4,
        }}
      >
        {/* Chat Window with Hero Section Inside */}
        <ChatWindow />
      </Box>
    </Container>
  );
}
