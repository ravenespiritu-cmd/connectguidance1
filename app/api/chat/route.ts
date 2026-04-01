import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Chat endpoint scaffold" }, { status: 200 });
}
