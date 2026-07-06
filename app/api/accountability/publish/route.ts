import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const {
      roomCode,
      eventName,
      data,
      // Optional client-provided overrides
      pusherAppId,
      pusherKey,
      pusherSecret,
      pusherCluster,
    } = payload;

    if (!roomCode || !eventName || !data) {
      return NextResponse.json(
        { error: "Missing required fields: roomCode, eventName, data" },
        { status: 400 }
      );
    }

    // Resolve credentials
    const appId = pusherAppId || process.env.PUSHER_APP_ID;
    const key = pusherKey || process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = pusherSecret || process.env.PUSHER_SECRET;
    const cluster = pusherCluster || process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
      return NextResponse.json(
        {
          error: "Pusher credentials are not configured! Please set them via Netlify environment variables or input them in the settings panel.",
        },
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

    const channelName = `accountability-${roomCode}`;
    await pusher.trigger(channelName, eventName, data);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/accountability/publish failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to publish event to Pusher." },
      { status: 500 }
    );
  }
}
