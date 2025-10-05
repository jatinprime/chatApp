// src/components/MessageInput.tsx
"use client";

import { useRef, useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sendMessage, selectChat, addMessage, updateMessage, markMessageFailed } from "@/store/slices/chatSlice";
import { X, Send, Image } from "lucide-react";
import toast from "react-hot-toast";
import { getSocket } from "@/lib/socketClient";
import { axiosInstance } from "@/lib/axios";

function makeClientId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const MessageInput: React.FC = () => {
  const dispatch = useAppDispatch();
  const { selectedUser , disappearing  } = useAppSelector(selectChat);
  const isDisappearing = !!(selectedUser && disappearing?.[selectedUser._id]);

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // DOM input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<File | null>(null);
  const fileObjectUrlRef = useRef<string | null>(null);
  const base64Ref = useRef<string | null>(null);

  const typingTimer = useRef<number | null>(null);
  const isMounted = useRef(true);

  // NEW: track whether we are currently sending (uploading)
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current);
        fileObjectUrlRef.current = null;
      }
    };
  }, []);

   // Helper: convert File -> dataURL (base64)
   function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onerror = () => {
          reader.abort();
          reject(new Error("Failed to read file"));
        };
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") resolve(result);
          else reject(new Error("Unexpected FileReader result"));
        };
        reader.readAsDataURL(file);
      } catch (err) {
        reject(err);
      }
    });
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef.current = file;     

    // Normalize possible bad mime types (image/jpg -> image/jpeg)
    let mime = file.type || "";
    if (mime === "image/jpg") mime = "image/jpeg";

    if (mime && !mime.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Cleanup previous object URL
    if (fileObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(fileObjectUrlRef.current);
      } catch {
        /* ignore */
      }
      fileObjectUrlRef.current = null;
    }

    // 1) Immediate preview (fast, reliable)
    try {
      const objUrl = URL.createObjectURL(file);
      fileObjectUrlRef.current = objUrl;
      setImagePreview(objUrl);
    } catch (err) {
      console.warn("object URL creation failed:", err);
      setImagePreview(null);
    }

    // 2) Also generate base64 for remote sending (async)
    base64Ref.current = null; // reset
    fileToBase64(file)
      .then((dataUrl) => {
        if (!isMounted.current) return;
        base64Ref.current = dataUrl;
      })
      .catch((err) => {
        console.warn("Failed to generate base64 for file:", err);
        base64Ref.current = null;
      });
  };

  const removeImage = () => {
    setImagePreview(null);
    base64Ref.current = null;
    fileRef.current = null;     
    
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (fileObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(fileObjectUrlRef.current);
      } catch {
        /* ignore */
      }
      fileObjectUrlRef.current = null;
    }
  };

  // emit typing true, then schedule false after idle
  function emitTyping(isTyping: boolean) {
    const socket = getSocket();
    if (!socket || !selectedUser) return;
    try {
      socket.emit("typing", { to: selectedUser._id, isTyping });
    } catch (err) {
      // ignore
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);

    // emit typing true and debounce turning it off
    emitTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      emitTyping(false);
      typingTimer.current = null;
    }, 1400);
  }

  async function ensureBase64Ready(): Promise<string | null> {
    if (base64Ref.current) return base64Ref.current;

    // Try to get file from input and convert on-demand
    const file = fileInputRef.current?.files?.[0];
    if (!file) return null;

    try {
      const dataUrl = await fileToBase64(file);
      base64Ref.current = dataUrl;
      return dataUrl;
    } catch (err) {
      console.warn("Failed to create base64 on-demand:", err);
      return null;
    }
  }

  async function handleSendMessage(e?: FormEvent) {
    e?.preventDefault();
    if (!selectedUser) return;
    if (!text.trim() && !imagePreview) return;

    // Prevent double-send while uploading
    if (isSending) return;

    const content = text.trim();
    const socket = getSocket();
    const clientId = makeClientId();

    // ensure we have base64 if there's an image
    let base64ForSend: string | null = null;
    if (imagePreview) {
      base64ForSend = await ensureBase64Ready();
      if (!base64ForSend) {
        // if we couldn't produce base64, still allow sending text-only
        if (!base64ForSend && !content) {
          toast.error("Failed to process image. Try again.");
          return;
        }
      }
    }

    // Build payload once
    const socketPayload = {
      to: selectedUser._id,
      content,
      meta: base64ForSend ? { image: base64ForSend } : {},
      ephemeral: isDisappearing, // important
      clientId,
    };

    try {
      setIsSending(true); // <-- start sending lock

      if (socket) {
        // 1) Realtime: emit via socket
        socket.emit("send-message", socketPayload, (ack: any) => {
          // optional ack handling
          // console.log("socket send ack:", ack);
        });

        // Also add the optimistic message locally so sender sees it immediately
        const optimisticMsg = {
          _id: clientId, // use clientId as temp id
          senderId: (socket as any).userId ?? "me", // optional
          receiverId: selectedUser._id,
          text: content || null,
          createdAt: new Date().toISOString(),
          image: base64ForSend ?? undefined,
          clientId,
          status: "sending" as const,
        };
        dispatch(addMessage(optimisticMsg as any));

        if (!isDisappearing) {
          try {
            // If we have the original File, use FormData so server uses upload_stream
            if (fileRef.current) {
              const form = new FormData();
              form.append("image", fileRef.current);         // server will read formData.get("image")
              form.append("text", content || "");
              const saved = await axiosInstance.post(`/messages/send/${selectedUser._id}`, form);
              const savedMessage = saved.data;
              // replace optimistic message with saved message locally
              dispatch(updateMessage({ clientId, message: savedMessage }));
              // notify server to relay update to recipient(s)
              socket.emit("message-saved", { to: selectedUser._id, clientId, savedMessage });
            } else {
              // no fileRef (maybe only base64 or only text) - send JSON
              const saved = await axiosInstance.post(`/messages/send/${selectedUser._id}`, {
                text: content || "",
                image: base64ForSend ?? undefined,
              });
              const savedMessage = saved.data;
              dispatch(updateMessage({ clientId, message: savedMessage }));
              socket.emit("message-saved", { to: selectedUser._id, clientId, savedMessage });
            }
          } catch (restErr) {
            console.error("Failed to persist message via REST:", restErr);
            // mark optimistic message as failed so UI (or future features) can show retry
            dispatch(markMessageFailed({ clientId }));
            toast.error("Message sent but failed to persist. It may be lost after refresh.");
          }
        } else {
          // ephemeral mode: do NOT call REST
        }
      } else {
        // no socket -> fallback to REST persist (no optimistic emit)
        if (isDisappearing) {
          toast.error("Cannot send ephemeral message — connection unavailable. Try again when online.");
          setIsSending(false);
          return;
        }
        // Fallback: use existing thunk that persists and updates state
        try {
          if (fileRef.current) {
            const form = new FormData();
            form.append("image", fileRef.current);
            form.append("text", content || "");
            const saved = await axiosInstance.post(`/messages/send/${selectedUser._id}`, form);
            const savedMessage = saved.data;
            dispatch(addMessage(savedMessage));
          } else {
            const saved = await dispatch(sendMessage({ receiverId: selectedUser._id, text: content, image: base64ForSend ?? undefined })).unwrap();
            // thunk already pushes message
          }
        } catch (err) {
          console.error("Failed to send message via REST fallback:", err);
          toast.error("Failed to send message");
          setIsSending(false);
          return;
        }
      }

      // stop typing and clear input
      emitTyping(false);
      if (typingTimer.current) {
        window.clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }

      setText("");
      removeImage();
    } catch (err) {
      console.error("Unexpected error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      // always release the sending lock so user can retry on failure
      setIsSending(false);
    }
  }

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
            >
              <X className="size-3" />
            </button>
            {/* Spinner overlay while uploading */}
            {isSending && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
                <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                  <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder={selectedUser ? `Message ${selectedUser.fullName}` : "Select a user to message"}
            value={text}
            onChange={handleChange}
            disabled={!selectedUser}
            autoComplete="off"
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
            disabled={isSending}
          />
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={isSending || (!text.trim() && !imagePreview)}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
