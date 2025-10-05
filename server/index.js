// server/index.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie"); // <-- add this

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "replace_this";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true, // <-- allow cookies
  },
});

// in-memory presence map (userId -> Set(socketId))
const onlineUsers = new Map();

// Keep ephemeral states in memory
// key = `${min(user1,user2)}-${max(user1,user2)}`
const ephemeralStates = new Map();

// 🔹 Socket authentication middleware
io.use((socket, next) => {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) {
      console.log("[socket auth] No cookies found");
      return next(new Error("Unauthorized"));
    }

    const parsed = cookie.parse(rawCookie);
    const token = parsed["jwt"]; // <-- use the SAME cookie name your login sets

    if (!token) {
      console.log("[socket auth] No token cookie");
      return next(new Error("Unauthorized"));
    }

    // verify JWT
    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user; // attach user payload
    console.log("[socket auth] Authenticated:", user);

    next();
  } catch (err) {
    console.error("[socket auth error]", err.message);
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user.id || socket.user._id;
  console.log("✅ user connected:", userId, socket.id);

  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);
  socket.join(`user:${userId}`);

  // broadcast updated presence
  io.emit("online-users", Array.from(onlineUsers.keys()));
  io.emit("online-count", onlineUsers.size);

  // Toggle ephemeral mode for a conversation
  socket.on("toggle-ephemeral", ({ from, to, enabled }) => {
    const key = [from, to].sort().join("-");
    ephemeralStates.set(key, enabled);

    // Notify both users about updated ephemeral state
    io.to(`user:${from}`).emit("ephemeral-updated", { with: to, enabled });
    io.to(`user:${to}`).emit("ephemeral-updated", { with: from, enabled });

    console.log(`Ephemeral mode ${enabled ? "ON" : "OFF"} for ${key}`);
  });

  socket.on("send-message", (payload, ack) => {
    const key = [userId, payload.to].sort().join("-");
    const isEphemeral = ephemeralStates.get(key) || false;

    const meta = payload.meta || {};
    const clientId = payload.clientId || null;

    const msg = {
      from: userId,
      to: payload.to,
      content: payload.content,
      createdAt: new Date().toISOString(),
      ephemeral: isEphemeral,
      meta,
      image: meta.image ?? null,
      clientId, // pass back to clients so they can correlate
    };

    if (!isEphemeral) {
      // Example: await Message.create(msg);
    }

    io.to(`user:${payload.to}`).emit("receive-message", msg);
    socket.emit("receive-message", msg); // echo back to sender
    if (typeof ack === "function") ack({ status: "ok", message: msg });
  });

  // When client persisted via REST and wants to tell the other side:
  socket.on("message-saved", ({ to, clientId, savedMessage }) => {
    // relay to recipient and sender so both can replace the temp message with canonical message
    io.to(`user:${to}`).emit("message-updated", { clientId, savedMessage });
    socket.emit("message-updated", { clientId, savedMessage }); // also to sender sockets
  });

  socket.on("typing", ({ to, isTyping }) => {
    io.to(`user:${to}`).emit("typing", { from: userId, isTyping });
  });

  
  socket.on("toggle-ephemeral", ({ from, to, enabled }) => {
    // Notify both users (the sender & receiver)
    io.to(from).emit("ephemeral-updated", { with: to, enabled });
    io.to(to).emit("ephemeral-updated", { with: from, enabled });
  });

  socket.on("disconnect", () => {
    const s = onlineUsers.get(userId);
    if (s) {
      s.delete(socket.id);
      if (s.size === 0) onlineUsers.delete(userId);
    }
    io.emit("online-users", Array.from(onlineUsers.keys()));
    io.emit("online-count", onlineUsers.size);
  });
});

server.listen(PORT, () => console.log("Socket server running on", PORT));
