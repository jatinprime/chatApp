import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import Message from "@/models/Message";
import cloudinary from "@/lib/cloudinary";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    // Get JWT from cookie
    const token = req.headers.get("cookie")?.split("jwt=")[1]?.split(";")[0];
    if (!token) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    let text: string | null = null;
    let imageUrl: string | undefined = undefined;

    // Check Content-Type to decide how to parse
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle form-data
      const formData = await req.formData();
      text = (formData.get("text") as string) || null;
      const file = formData.get("image") as File | null;

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());

        const uploadResponse = await new Promise<any>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "messages" },
            (error, result) => (error ? reject(error) : resolve(result))
          );
          stream.end(buffer);
        });

        imageUrl = uploadResponse.secure_url;
      }
    } else if (contentType.includes("application/json")) {
      // Handle JSON body
      const body = await req.json();
      text = body.text || null;
      if (body.image) {
        // If image is sent as a URL/base64 in JSON
        const uploadResponse = await cloudinary.uploader.upload(body.image, {
          folder: "messages",
        });
        imageUrl = uploadResponse.secure_url;
      }
    }

    const reciever = (await params).id ;

    const newMessage = await Message.create({
      senderId: decoded.id,
      receiverId: reciever,
      text,
      image: imageUrl,
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error: any) {
    console.error("Error in sendMessage:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
