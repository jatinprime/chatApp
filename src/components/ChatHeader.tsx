// src/components/ChatHeader.tsx
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedUser, selectChat, toggleDisappearing } from "@/store/slices/chatSlice";
import { getSocket } from "@/lib/socketClient";

const ChatHeader: React.FC = () => {
  const dispatch = useAppDispatch();

  // Grab selectedUser, typing map and onlineUsers from chat slice
  const { selectedUser, typing, onlineUsers, disappearing  } = useAppSelector(selectChat);
  const authUser = useAppSelector((s: any) => s.auth?.authUser); // ✅ add this

  if (!selectedUser) return null;

  const isTyping = !!typing?.[selectedUser._id];
  const isOnline = onlineUsers?.includes(selectedUser._id);
  const isEphemeral = !!disappearing[selectedUser._id];

  const handleToggle = () => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("toggle-ephemeral", {
      from: authUser._id,
      to: selectedUser._id,
      enabled: !isEphemeral,
    });

    // also update local state immediately for snappy UI
    dispatch(toggleDisappearing({ userId: selectedUser._id, enabled: !isEphemeral }));
  };

  return (
    <div className={`p-2.5 border-b border-base-300 ${
      isEphemeral ? "bg-blue-400 text-white" : "bg-white"
    }`}>
      <div className="flex items-center justify-between">
        {/* Avatar + user info */}
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={
                  selectedUser.profilePic ||
                  "https://i.pinimg.com/736x/a2/11/7e/a2117e75dc55c149c2c68cbadee1f16e.jpg"
                }
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <div className="text-sm text-zinc-400">
              {isTyping ? "Typing…" : isOnline ? "Online" : "Offline"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Disappearing toggle */}
          <button
            onClick={handleToggle}
            className={`btn btn-xs ${isEphemeral ? "btn-ghost text-emerald-600" : "btn-outline text-zinc-600"}`}
            title={isEphemeral ? "Disappearing ON" : "Disappearing OFF"}
          >
            {isEphemeral ? "Ephemeral" : "Normal"}
          </button>

          {/* Close button */}
          <button onClick={() => dispatch(setSelectedUser(null))} aria-label="Close chat">
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
