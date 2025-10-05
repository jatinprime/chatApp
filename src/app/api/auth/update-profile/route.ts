import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import cloudinary from "@/lib/cloudinary";
import streamifier from "streamifier"; // ✅ new helper

export async function PUT(req: Request) {
  try {
    await dbConnect();

    const token = req.headers.get("cookie")?.split("jwt=")[1]?.split(";")[0];
    if (!token) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const form = await req.formData();
    console.log("Form keys:", [...form.keys()].map(k => `"${k}"`)); // debug

    // Fix: Trim key spaces
    let file: File | null = null;
    for (const key of form.keys()) {
      if (key.trim() === "profilePic") {
        file = form.get(key) as File | null;
        break;
      }
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // ✅ Upload with stream (Cloudinary handles MIME automatically)
    const uploadRes: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "profiles" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
    if (!uploadRes.secure_url) {
      return NextResponse.json({ message: "Error in uploading image" }, { status: 500 });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { profilePic: uploadRes.secure_url },
      { new: true }
    );

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    console.error("Error in update profile:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
