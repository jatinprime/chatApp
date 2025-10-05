// src/lib/socketClient.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function initSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
      withCredentials: true, // IMPORTANT: send cookies (includes your JWT httpOnly token)
      transports: ["polling", "websocket"], // make sure websockets are used
    });
  }
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
