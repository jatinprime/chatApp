"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signup } from "@/store/slices/authSlice";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, User } from "lucide-react";
import Link from "next/link";
import AuthImagePattern from "@/components/AuthImagePattern";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

const SignUpPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isSigningUp } = useAppSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    profilePic: "https://i.pinimg.com/736x/a2/11/7e/a2117e75dc55c149c2c68cbadee1f16e.jpg" ,
  });

  const [animateCard, setAnimateCard] = useState(false);

  useEffect(() => {
    setAnimateCard(true);
  }, []);

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm() === true) {
      toast.promise(
        dispatch(signup(formData)).unwrap(),
        {
          loading: "Signing up...",
          success: "Account created successfully!",
          error: "Failed to create account",
        }
      )
      .then(() => {
        // Navigate to home page after successful login
        router.push("/");
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-800 relative">
      {/* Toast Container */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* Left Side: Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div
          className={
            "w-full max-w-md transform transition-all duration-700 " +
            (animateCard ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10")
          }
        >
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center transition-colors duration-300 group-hover:bg-purple-200">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-200">Create Account</h1>
              <p className="text-gray-200">Get started with your free account</p>
            </div>
          </div>

          <div className="bg-gray-700 shadow-xl rounded-xl p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="relative group">
                <label className="block text-gray-200 font-medium mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <User className="w-5 h-5 text-gray-400 group-focus-within:text-purple-600 transition-colors duration-300" />
                  </div>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="input input-bordered w-full pl-10 rounded-lg border-gray-700 bg-gray-700 text-gray-200 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="relative group">
                <label className="block text-gray-200 font-medium mb-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-purple-400 transition-colors duration-300" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="input input-bordered w-full pl-10 rounded-lg border-gray-700 bg-gray-700 text-gray-200 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="relative group">
                <label className="block text-gray-200 font-medium mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-purple-600 transition-colors duration-300" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="input input-bordered w-full pl-10 rounded-lg border-gray-700 bg-gray-700 text-gray-200 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400 hover:text-purple-600 transition-colors" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400 hover:text-purple-600 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 active:scale-95 transition-transform duration-150"
                disabled={isSigningUp}
              >
                {isSigningUp ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <p className="text-center text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-purple-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <AuthImagePattern
        title="Join our community"
        subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
      />
    </div>
  );
};

export default SignUpPage;
