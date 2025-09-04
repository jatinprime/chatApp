import { Server } from "socket.io";
import { NextApiRequest } from "next";
import { Server as HTTPServer } from "http";

interface ExtendedNextApiResponse extends NextApiRequest {
  socket: any;
}

let io: Server;

export const userSocketMap: Record<string, string> = {}; // userId -> socketId

export function getReceiverSocketId(userId: string) {
  return userSocketMap[userId];
}

export default function initSocket(server: HTTPServer) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: "http://localhost:3000", // frontend origin
        methods: ["GET", "POST" , "PUT"],
      },
    });

    io.on("connection", (socket) => {
      console.log("A user connected", socket.id);

      const { userId } = socket.handshake.query;
      if (userId) userSocketMap[userId as string] = socket.id;

      io.emit("getOnlineUsers", Object.keys(userSocketMap));

      socket.on("disconnect", () => {
        console.log("A user disconnected", socket.id);
        if (userId) delete userSocketMap[userId as string];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
      });

      socket.on("sendMessage", ({ to, message }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", message);
        }
      });
    });
  }

  return io;
}
