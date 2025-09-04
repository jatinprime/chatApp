import { NextResponse } from "next/server";

export async function POST() {
  try {
    const res = NextResponse.json({ message: "Logged out successfully" });
    res.cookies.set("jwt", "", { maxAge: 0, path: "/" }); // clear cookie
    return res;
  } catch (err: any) {
    console.error("Error in logout:", err.message);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
