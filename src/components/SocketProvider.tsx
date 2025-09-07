// src/components/SocketProvider.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { initSocket, disconnectSocket } from "@/lib/socketClient";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addMessage,
  setOnlineUsers as setOnlineUsersAction,
  setOnlineCount as setOnlineCountAction,
  setTyping as setTypingAction,
} from "@/store/slices/chatSlice";

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s: any) => s.auth?.authUser);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!authUser) {
      // disconnect if user logs out
      disconnectSocket();
      socketRef.current = null;
      return;
    }

    const socket = initSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[socket] connected", socket.id);
    });

    socket.on("connect_error", (err: any) => {
      console.error("[socket] connect_error", err.message || err);
    });

    socket.on("online-users", (userIds: string[]) => {
      dispatch(setOnlineUsersAction(userIds));
    });

    socket.on("online-count", (count: number) => {
      dispatch(setOnlineCountAction(count));
    });

    socket.on("receive-message", (message: any) => {
      const normalized = {
        _id: message.id ?? message._id ?? `${message.from}-${message.createdAt}`,
        senderId: message.from ?? message.senderId,
        receiverId: message.to ?? message.receiverId,
        text: message.content ?? message.text,
        createdAt: message.createdAt,
        image: message.meta?.image ?? undefined,
      };
      dispatch(addMessage(normalized));
    });

    socket.on("typing", ({ from, isTyping }: { from: string; isTyping: boolean }) => {
      dispatch(setTypingAction({ userId: from, isTyping }));
    });

    // no disconnect on route change, only when user logs out
    return () => {};
  }, [authUser, dispatch]);

  return <>{children}</>;
}
