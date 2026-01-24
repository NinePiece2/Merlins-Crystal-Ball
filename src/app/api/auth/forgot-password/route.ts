import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Better-auth handles password reset requests through its own endpoint
  // This route just delegates to better-auth's built-in mechanism
  const response = await auth.handler(req);
  return response;
}
