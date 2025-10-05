import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { axiosInstance } from "@/lib/axios";
import toast from "react-hot-toast";
import { RootState } from "../store";

// ------------------ Types ------------------
export interface User {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  image?: string;
  clientId?: string; // optimistic id from client
  status?: "sending" | "sent" | "failed"; // optional status
}

interface ChatState {
  users: User[];
  messages: Message[];
  selectedUser: User | null;
  isUsersLoading: boolean;
  isMessagesLoading: boolean;

  // --- NEW ---
  onlineUsers: string[];
  onlineCount: number;
  typing: Record<string, boolean>; // userId → typing status
  disappearing: Record<string, boolean>; // userId -> boolean
}

const initialState: ChatState = {
  users: [],
  messages: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  // --- NEW ---
  onlineUsers: [],
  onlineCount: 0,
  typing: {},
  disappearing: {},
};

// ------------------ Async Thunks ------------------
export const getUsers = createAsyncThunk<User[], void, { rejectValue: string }>(
  "chat/getUsers",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/messages/users");
      return res.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
      return rejectWithValue(error.response?.data?.message || "Failed to fetch users");
    }
  }
);

export const getMessages = createAsyncThunk<Message[], string, { rejectValue: string }>(
  "chat/getMessages",
  async (userId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      return res.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
      return rejectWithValue(error.response?.data?.message || "Failed to fetch messages");
    }
  }
);

export const sendMessage = createAsyncThunk<
  Message,
  { receiverId: string; text: string; image?: string },
  { state: RootState; rejectValue: string }
>(
  "chat/sendMessage",
  async (messageData, { getState, rejectWithValue }) => {
    try {
      const selectedUser = getState().chat.selectedUser;
      if (!selectedUser) throw new Error("No selected user");
      // console.log(messageData) ;
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      return res.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send message");
      return rejectWithValue(error.response?.data?.message || "Failed to send message");
    }
  }
);

// ------------------ Slice ------------------
const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setSelectedUser(state, action: PayloadAction<User | null>) {
      state.selectedUser = action.payload;
      state.messages = []; // reset messages on user change
    },
    clearChat(state) {
      state.users = [];
      state.messages = [];
      state.selectedUser = null;
      state.onlineUsers = [];
      state.onlineCount = 0;
      state.typing = {};
    },
    
    // inside reducers:
    addMessage(state, action: PayloadAction<Message & { clientId?: string }>) {
      const incoming = action.payload as Message & { clientId?: string };

      // treat clientId as alternate unique id
      const exists = state.messages.find(
        (m) =>
          m._id === incoming._id ||
          // @ts-ignore - some messages may carry clientId property
          ((m as any).clientId && incoming.clientId && (m as any).clientId === incoming.clientId)
      );
      if (exists) return; // already present -> skip

      // push new message
      state.messages.push(incoming as Message);
    },

    updateMessage(state, action: PayloadAction<{ clientId?: string; message: Message }>) {
      const { clientId, message } = action.payload;
      const matchIdx = state.messages.findIndex(
        (m) =>
          m._id === message._id ||
          (clientId && ((m as any).clientId === clientId || m._id === clientId))
      );

      // ensure message has explicit sent status (unless ephemeral)
      const toStore: Message = {
        ...message,
        status: message.status ?? "sent",
      };

      if (matchIdx !== -1) {
        // preserve any clientId on optimistic message
        const preservedClientId = (state.messages[matchIdx] as any).clientId;
        state.messages[matchIdx] = message;
        if (preservedClientId) (state.messages[matchIdx] as any).clientId = preservedClientId;
      } else {
        // not found -> append saved message
        state.messages.push(message);
      }
    },

    // mark existing optimistic message as failed (used on REST failure)
    markMessageFailed(state, action: PayloadAction<{ clientId: string }>) {
      const { clientId } = action.payload;
      const idx = state.messages.findIndex((m) => m.clientId === clientId || m._id === clientId);
      if (idx !== -1) {
        state.messages[idx].status = "failed";
      }
    },

    // --- NEW ---
    setOnlineUsers(state, action: PayloadAction<string[]>) {
      state.onlineUsers = action.payload;
    },
    setOnlineCount(state, action: PayloadAction<number>) {
      state.onlineCount = action.payload;
    },
    setTyping(state, action: PayloadAction<{ userId: string; isTyping: boolean }>) {
      state.typing[action.payload.userId] = action.payload.isTyping;
    },
    toggleDisappearing(state, action: PayloadAction<{ userId: string; enabled: boolean }>) {
      const { userId, enabled } = action.payload;
      state.disappearing = { ...state.disappearing, [userId]: enabled };
    },
  },
  extraReducers: (builder) => {
    // getUsers
    builder
      .addCase(getUsers.pending, (state) => {
        state.isUsersLoading = true;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.users = action.payload;
        state.isUsersLoading = false;
      })
      .addCase(getUsers.rejected, (state) => {
        state.isUsersLoading = false;
      });

    // getMessages
    builder
      .addCase(getMessages.pending, (state) => {
        state.isMessagesLoading = true;
      })
      .addCase(getMessages.fulfilled, (state, action) => {
        state.messages = action.payload;
        state.isMessagesLoading = false;
      })
      .addCase(getMessages.rejected, (state) => {
        state.isMessagesLoading = false;
      });

    // sendMessage
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.messages.push(action.payload);
    });
  },
});

export const {
  setSelectedUser,
  addMessage,
  clearChat,
  setOnlineUsers,
  setOnlineCount,
  setTyping,
  toggleDisappearing,
  updateMessage,
  markMessageFailed
} = chatSlice.actions;

export const selectChat = (state: RootState) => state.chat;

export default chatSlice.reducer;
