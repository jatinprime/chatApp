import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import Message from "@/models/Message";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const user = await params;

    const token = req.headers.get("cookie")?.split("jwt=")[1]?.split(";")[0];
    if (!token) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const messages = await Message.find({
      $or: [
        { senderId: decoded.id, receiverId : user.id },
        { senderId: user.id, receiverId: decoded.id },
      ],
    }).sort({ createdAt: 1 });

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error("Error in getMessages:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
