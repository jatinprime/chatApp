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
  toggleDisappearing, 
  updateMessage
} from "@/store/slices/chatSlice";
import { store } from "@/store/store";

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s: any) => s.auth?.authUser);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!authUser) {
      // user logged out -> disconnect
      disconnectSocket();
      socketRef.current = null;
      return;
    }

    const socket = initSocket();
    if (!socket) return;
    socketRef.current = socket;

    const onConnect = () => {
      console.log("[socket] connected", socket.id);
    };
    const onConnectError = (err: any) => {
      console.error("[socket] connect_error", err?.message ?? err);
    };
    const onOnlineUsers = (userIds: string[]) => {
      dispatch(setOnlineUsersAction(userIds));
    };
    const onOnlineCount = (count: number) => {
      dispatch(setOnlineCountAction(count));
    };

    const onReceiveMessage = (message: any) => {
      const normalized = {
        _id: message.id ?? message._id ?? `${message.from}-${message.createdAt}`,
        senderId: message.from ?? message.senderId,
        receiverId: message.to ?? message.receiverId,
        text: message.content ?? message.text,
        createdAt: message.createdAt,
        image: message.image ?? message.meta?.image ?? undefined,
        ephemeral: message.ephemeral ?? false,
        clientId: message.clientId ?? undefined,
      };

      const currentMessages = store.getState().chat.messages as any[];

      // If incoming message contains clientId -> it's probably the same optimistic message,
      // so update instead of adding a duplicate
      if (normalized.clientId) {
        dispatch(updateMessage({ clientId: normalized.clientId, message: normalized }));
        return;
      }

      // If a message with the same _id already exists -> skip
      const exists = currentMessages.find((m) => m._id === normalized._id || (m as any).clientId === normalized.clientId);
      if (exists) return;


      dispatch(addMessage(normalized));
    };

    const onMessageUpdated = ({ clientId, savedMessage }: { clientId: string; savedMessage: any }) => {
      // savedMessage should be the DB message returned from REST (has _id, image=cloudinary url)
      const normalized = {
        _id: savedMessage._id ?? savedMessage.id,
        senderId: savedMessage.senderId,
        receiverId: savedMessage.receiverId,
        text: savedMessage.text,
        createdAt: savedMessage.createdAt ?? new Date().toISOString(),
        image: savedMessage.image ?? undefined,
      };
      dispatch(updateMessage({ clientId, message: normalized }));
    };

    // remove previous handlers (important to avoid stacking) then add
    socket.off("connect", onConnect);
    socket.on("connect", onConnect);

    socket.off("connect_error", onConnectError);
    socket.on("connect_error", onConnectError);

    socket.off("online-users", onOnlineUsers);
    socket.on("online-users", onOnlineUsers);

    socket.off("online-count", onOnlineCount);
    socket.on("online-count", onOnlineCount);

    socket.off("receive-message", onReceiveMessage);
    socket.on("receive-message", onReceiveMessage);

    socket.off("message-updated", onMessageUpdated);
    socket.on("message-updated", onMessageUpdated);


    const onTyping = ({ from, isTyping }: { from: string; isTyping: boolean }) => {
      dispatch(setTypingAction({ userId: from, isTyping }));
    };
    const onEphemeralUpdated = ({ with: userId, enabled }: { with: string; enabled: boolean }) => {
      dispatch(toggleDisappearing({ userId, enabled }));
    };

    socket.off("typing", onTyping);
    socket.on("typing", onTyping);
    socket.off("ephemeral-updated", onEphemeralUpdated);
    socket.on("ephemeral-updated", onEphemeralUpdated);

    // cleanup when authUser changes/unmount
    return () => {
      if (!socket) return;
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("online-users", onOnlineUsers);
      socket.off("online-count", onOnlineCount);
      socket.off("receive-message", onReceiveMessage);
      socket.off("typing", onTyping);
      socket.off("ephemeral-updated", onEphemeralUpdated);
      // don't disconnect here to preserve connection between route changes; disconnect on logout above
    };
  }, [authUser, dispatch]);

  return <>{children}</>;
}
