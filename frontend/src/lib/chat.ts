import { apiRequest } from "@/lib/api";

export type ChatRole = "user" | "model";

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

interface ChatResponse {
  success: boolean;
  reply: string;
}

// Sends a message to the server-side Gemini helper. The API key lives only in
// the PHP backend (backend/.env) — it is never exposed to the browser.
export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const data = await apiRequest<ChatResponse>("/chat/message.php", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
  return data.reply;
}
