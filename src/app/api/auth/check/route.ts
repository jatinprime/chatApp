import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const token = req.headers.get("cookie")?.split("jwt=")[1]?.split(";")[0];

    if (!token) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json(user);
  } catch (err: any) {
    console.error("Error in checkAuth:", err.message);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
