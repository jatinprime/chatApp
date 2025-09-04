import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedUser, selectChat } from "@/store/slices/chatSlice";

const ChatHeader: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const { selectedUser } = useAppSelector(selectChat);

  if (!selectedUser) return null;

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        {/* Avatar + user info */}
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser.profilePic || "https://i.pinimg.com/736x/a2/11/7e/a2117e75dc55c149c2c68cbadee1f16e.jpg"}
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => dispatch(setSelectedUser(null))}
          aria-label="Close chat"
        >
          <X />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
