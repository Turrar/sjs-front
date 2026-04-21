import { io, type Socket } from "socket.io-client";
import { getSocketBase } from "@/lib/api-base";

/**
 * Namespace `/chat` на том же origin, что и API (см. getSocketBase / NEXT_PUBLIC_SOCKET_URL).
 * Handshake: JWT в `auth.token` и в `query.token`.
 *
 * События: `join` (строка applicationId) → ack `{ ok: true } | { error: "forbidden" }`;
 * `send` → `{ applicationId, body }` → ack сообщение или `{ error: "failed" }`.
 * Входящие от сервера: `message` (рассылка в комнату после успешного send).
 */
export function createChatSocket(accessToken: string): Socket {
  const base = getSocketBase();
  return io(`${base}/chat`, {
    auth: { token: accessToken },
    query: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  });
}
