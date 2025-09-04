import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export function generateToken(userId: string, res: NextResponse) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  res.cookies.set("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return token;
}

export function formatMessageTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
