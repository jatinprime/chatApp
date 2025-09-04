import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { generateToken } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { fullName, email, password } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ message: "Email already exists" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await User.create({ fullName, email, password: hashed });

    const res = NextResponse.json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });

    generateToken(newUser._id.toString(), res); // set jwt cookie

    return res;
  } catch (err: any) {
    console.error("Error in signup:", err.message);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
