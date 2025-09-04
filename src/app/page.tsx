"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { checkAuth } from "../store/slices/authSlice";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { authUser, isCheckingAuth } = useAppSelector((state) => state.auth);
  const { selectedUser } = useAppSelector((state) => state.chat);

  // Check auth on mount
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isCheckingAuth && !authUser) {
      toast.error("You must be logged in to access the chat");
      router.replace("/login");
    }
  }, [authUser, isCheckingAuth, router]);

  // Show loading while checking
  if (isCheckingAuth || !authUser) {
    return (
      <div className="flex items-center justify-center h-screen text-base-content/70">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="h-screen bg-base-200">
      {/* Navbar only shown if authenticated */}
      {authUser && <Navbar />}

      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
