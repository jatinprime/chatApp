// lib/socketClient.ts  <-- client-side only
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = (userId: string) => {
  if (socket?.connected) return socket;

  socket = io("http://localhost:3000", { // or your production URL
    query: { userId },
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
  socket = null;
};

export const getSocket = () => socket;
