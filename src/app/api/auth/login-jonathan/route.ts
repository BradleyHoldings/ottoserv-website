import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "disabled",
      message: "Use /login so OttoServ can create the legitimate server-side session.",
    },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL || "https://www.ottoserv.com"));
}
