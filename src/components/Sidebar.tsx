"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getUsers, setSelectedUser } from "@/store/slices/chatSlice";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const { users, selectedUser, isUsersLoading, onlineUsers  } = useAppSelector((state) => state.chat);


  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    dispatch(getUsers());
    // console.log(users) ;
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
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      {/* Users list */}
      <div className="overflow-y-auto w-full py-3 flex-1">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => dispatch(setSelectedUser(user))}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-200 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-primary" : ""}
            `}
          >
            {/* Avatar */}
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "https://i.pinimg.com/736x/a2/11/7e/a2117e75dc55c149c2c68cbadee1f16e.jpg"}
                alt={user.fullName}
                className="size-12 object-cover rounded-full"
              />
              {/* 🚨 skip online badge for now ,,, I have added online badge*/}
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>

            {/* User info */}
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium text-gray-600 truncate">{user.fullName}</div>
              <div className="text-sm text-zinc-400">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No users found</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
