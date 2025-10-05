import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { axiosInstance } from "@/lib/axios";
import toast from "react-hot-toast";

interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  authUser: AuthUser | null;
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
}

const initialState: AuthState = {
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
};

// ----------------- Async Thunks -----------------
export const checkAuth = createAsyncThunk("auth/checkAuth", async (_, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.get("/auth/check");
    return res.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Auth check failed");
  }
});

export const signup = createAsyncThunk("auth/signup", async (data: any, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.post("/auth/signup", data);
    toast.success("Account created successfully");
    return res.data;
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Signup failed");
    return rejectWithValue(error.response?.data?.message);
  }
});

export const login = createAsyncThunk("auth/login", async (data: any, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.post("/auth/login", data);
    toast.success("Logged in successfully");
    return res.data;
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Login failed");
    return rejectWithValue(error.response?.data?.message);
  }
});

export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await axiosInstance.post("/auth/logout");
    toast.success("Logged out successfully");
    
    return null;
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Logout failed");
    return rejectWithValue(error.response?.data?.message);
  }
});

export const updateProfile = createAsyncThunk("auth/updateProfile", async (data: any, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.put("/auth/update-profile", data);
    toast.success("Profile updated successfully");
    return res.data;
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Profile update failed");
    return rejectWithValue(error.response?.data?.message);
  }
});

// ----------------- Slice -----------------
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    initializeAuth: (state) => {
      const storedUser = localStorage.getItem("authUser");
      if (storedUser) {
        state.authUser = JSON.parse(storedUser);
      }
      state.isCheckingAuth = false;
    },
  },
  extraReducers: (builder) => {

    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.isSigningUp = true;
      })
      .addCase(signup.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.authUser = action.payload;
        localStorage.setItem("authUser", JSON.stringify(action.payload)); // ✅ Save
      })
      .addCase(signup.rejected, (state) => {
        state.isSigningUp = false;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoggingIn = true;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.isLoggingIn = false;
        state.authUser = action.payload;
        localStorage.setItem("authUser", JSON.stringify(action.payload)); // ✅ Save
      })
      .addCase(login.rejected, (state) => {
        state.isLoggingIn = false;
      });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.authUser = null;
      state.isLoggingIn = false;
      localStorage.removeItem("authUser"); // ✅ Clear
    })

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isUpdatingProfile = true;
      })
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.authUser = action.payload;
        state.isUpdatingProfile = false;
      })
      .addCase(updateProfile.rejected, (state) => {
        state.isUpdatingProfile = false;
      });
  },
});

export const { initializeAuth } = authSlice.actions;
export default authSlice.reducer;
