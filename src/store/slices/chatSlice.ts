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
}

interface ChatState {
  users: User[];
  messages: Message[];
  selectedUser: User | null;
  isUsersLoading: boolean;
  isMessagesLoading: boolean;
}

const initialState: ChatState = {
  users: [],
  messages: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
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
  { receiverId: string; text: string; image?: string }, // <-- add image?
  { state: RootState; rejectValue: string }
>(
  "chat/sendMessage",
  async (messageData, { getState, rejectWithValue }) => {
    try {
      const selectedUser = getState().chat.selectedUser;
      if (!selectedUser) throw new Error("No selected user");

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
    addMessage(state, action: PayloadAction<Message>) {
      state.messages.push(action.payload);
    },
    clearChat(state) {
      state.users = [];
      state.messages = [];
      state.selectedUser = null;
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

export const { setSelectedUser, addMessage, clearChat } = chatSlice.actions;

export const selectChat = (state: RootState) => state.chat;

export default chatSlice.reducer;
