import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { roomCode, event, sender, data, customCredentials } = payload;

    if (!roomCode || !event || !sender) {
      return NextResponse.json(
        { error: "Missing required fields: roomCode, event, sender" },
        { status: 400 }
      );
    }

    const appId = customCredentials?.appId || process.env.PUSHER_APP_ID;
    const key = customCredentials?.key || process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY;
    const secret = customCredentials?.secret || process.env.PUSHER_SECRET;
    const cluster = customCredentials?.cluster || process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
      return NextResponse.json(
        { error: "Pusher credentials not configured" },
        { status: 400 }
      );
    }

    const pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });

    await pusher.trigger(`room-${roomCode}`, event, { sender, data });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/accountability/publish failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to publish event to Pusher." },
      { status: 500 }
    );
  }
}
