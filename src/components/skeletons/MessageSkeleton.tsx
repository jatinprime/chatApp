import React from "react";

interface MessageSkeletonProps {
  count?: number; // Number of skeleton messages, default 6
}

const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ count = 6 }) => {
  const skeletonMessages = Array.from({ length: count });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-busy="true">
      {skeletonMessages.map((_, idx) => (
        <div
          key={idx}
          className={`chat ${idx % 2 === 0 ? "chat-start" : "chat-end"}`}
        >
          {/* Avatar */}
          <div className="chat-image avatar">
            <div className="size-10 rounded-full border">
              <div className="skeleton w-full h-full rounded-full" />
            </div>
          </div>

          {/* Header (time) */}
          <div className="chat-header mb-1">
            <div className="skeleton h-4 w-16 rounded" />
          </div>

          {/* Message bubble */}
          <div className="chat-bubble bg-transparent p-0">
            <div className="skeleton h-16 sm:w-[200px] w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;
