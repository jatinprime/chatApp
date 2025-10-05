"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getUsers, setSelectedUser } from "@/store/slices/chatSlice";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const { users, selectedUser, isUsersLoading, onlineUsers, typing } = useAppSelector(
    (state) => state.chat
  );

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 bg-base-100">
      {/* Header */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6 text-primary" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        {/* Online filter */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm checkbox-primary"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({Math.max(0, onlineUsers.length - 1)} online)</span>
        </div>
      </div>

      {/* Users list */}
      <div className="overflow-y-auto w-full py-3 flex-1">
        {filteredUsers.map((user) => {
          const isOnline = onlineUsers.includes(user._id);
          const isTyping = !!typing?.[user._id];

          return (
            <button
              key={user._id}
              onClick={() => dispatch(setSelectedUser(user))}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-200 transition-colors text-left
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-primary" : ""}
              `}
            >
              {/* Avatar */}
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={
                    user.profilePic ||
                    "https://i.pinimg.com/736x/a2/11/7e/a2117e75dc55c149c2c68cbadee1f16e.jpg"
                  }
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full"
                />

                {/* Online dot (small) */}
                {isOnline && !isTyping && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}

                {/* Typing dot (pulsing and slightly larger so it's noticeable) */}
                {isTyping && (
                  <span
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full animate-pulse"
                    title="Typing..."
                  />
                )}
              </div>

              {/* User info */}
              <div className="hidden lg:block text-left min-w-0">
                <div className="font-medium text-gray-600 truncate">{user.fullName}</div>

                {/* Status: Typing (green) or Online/Offline */}
                <div>
                  {isTyping ? (
                    <span className="text-sm text-emerald-600 font-medium">Typing…</span>
                  ) : (
                    <span className="text-sm text-zinc-400">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-2">
                          {/* <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> */}
                          <span>Online</span>
                        </span>
                      ) : (
                        "Offline"
                      )}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No users found</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
