import { NextResponse } from "next/server";
import { getJarvisCommandCenterResponse } from "@/lib/commandCenter.mjs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // TODO: Replace this mock responder with the real Jarvis backend once the
  // command-center assistant endpoint is available.
  const response = getJarvisCommandCenterResponse(body.prompt, body.context);

  return NextResponse.json(response);
}
