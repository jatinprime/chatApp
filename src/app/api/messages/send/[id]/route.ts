// src/app/api/messages/send/[id]/route.ts
export const runtime = "nodejs"; // ensure Node runtime so streams & Buffer work

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import Message from "@/models/Message";
import cloudinary from "@/lib/cloudinary";
import streamifier from "streamifier";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - adjust if you like

function uploadBufferToCloudinary(buffer: Buffer, opts: Record<string, any> = {}) {
  return new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(opts, (err: any, result: any) => {
      if (err) return reject(err);
      resolve(result);
    });
    // stream the buffer into cloudinary
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    // Extract JWT from cookie header (same behaviour as your previous code)
    const cookieHeader = req.headers.get("cookie") ?? "";
    const token = cookieHeader.split("jwt=")[1]?.split(";")[0];
    if (!token) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    let text: string | null = null;
    let imageUrl: string | undefined = undefined;

    // detect content type
    const contentType = (req.headers.get("content-type") || "").toLowerCase();

    if (contentType.includes("multipart/form-data")) {
      // form-data path: expect form field "image" and optional "text"
      const formData = await req.formData();
      text = (formData.get("text") as string) || null;
      const file = formData.get("image") as File | null;

      if (file) {
        // size sanity
        const fileSize = Number(file.size || 0);
        if (fileSize && fileSize > MAX_FILE_SIZE) {
          return NextResponse.json({ error: "File too large" }, { status: 413 });
        }

        // convert to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // upload via streamifier -> cloudinary.upload_stream (more reliable than stream.end)
        try {
          const uploadResponse = await uploadBufferToCloudinary(buffer, { folder: "messages" });
          imageUrl = uploadResponse?.secure_url;
          // debug log (optional)
          console.log("Cloudinary uploaded (stream) ->", imageUrl);
        } catch (uploadErr: any) {
          console.error("Cloudinary upload (stream) error:", uploadErr);
          // give useful info to client for debugging
          return NextResponse.json(
            { error: "Image upload failed", details: uploadErr?.message ?? uploadErr },
            { status: 500 }
          );
        }
      }
    } else if (contentType.includes("application/json")) {
      // JSON path (body may include base64 data url)
      const body = await req.json().catch(() => ({}));
      text = body?.text ?? null;
      if (body?.image) {
        try {
          const uploadResponse = await cloudinary.uploader.upload(body.image, { folder: "messages" });
          imageUrl = uploadResponse?.secure_url;
          console.log("Cloudinary uploaded (base64) ->", imageUrl);
        } catch (uploadErr: any) {
          console.error("Cloudinary upload (base64) error:", uploadErr);
          return NextResponse.json(
            { error: "Image upload failed", details: uploadErr?.message ?? uploadErr },
            { status: 500 }
          );
        }
      }
    } else {
      // fallback: try JSON parse if content-type missing or unusual
      try {
        const body = await req.json();
        text = body?.text ?? null;
        if (body?.image) {
          const uploadResponse = await cloudinary.uploader.upload(body.image, { folder: "messages" });
          imageUrl = uploadResponse?.secure_url;
          console.log("Cloudinary uploaded (fallback base64) ->", imageUrl);
        }
      } catch (e) {
        // nothing to do, continue — maybe request had no body
      }
    }

    const receiver = (await params).id;

    const newMessage = await Message.create({
      senderId: decoded.id,
      receiverId: receiver,
      text,
      image: imageUrl,
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error: any) {
    console.error("Error in sendMessage:", error);
    const errMsg = error?.message ?? "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
