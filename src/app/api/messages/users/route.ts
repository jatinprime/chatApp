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

    const filteredUsers = await User.find({ _id: { $ne: decoded.id } }).select("-password");

    return NextResponse.json(filteredUsers);
  } catch (error: any) {
    console.error("Error in getUsersForSidebar:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
