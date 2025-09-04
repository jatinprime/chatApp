import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="flex flex-1 items-center justify-center bg-base-100/50 p-8">
      <div className="text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Welcome Text */}
        <h2 className="text-2xl font-bold text-base-content">Welcome to Chatty!</h2>
        <p className="text-base-content/60">
          Select a conversation from the sidebar to start chatting.
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;
