import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { headers } from "next/headers";
import { emailService } from "@/lib/email";

const isDevelopment = process.env.NODE_ENV === "development" || process.env.ENVIRONMENT === "dev";

interface SignUpResponseUser {
  [key: string]: unknown;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      const resetUrl = url;
      await emailService.send({
        to: [user.email],
        subject: `${isDevelopment ? "[Dev] " : ""}Password Reset Request - Merlin's Crystal Ball`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Reset</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e4e4e7; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #09090b;">
              <div style="background: linear-to-b from-background to-secondary/5; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border-bottom: 2px solid #27272a;">
                <h1 style="color: #fafafa; margin: 0; font-size: 32px; font-weight: 700;">🔮 Merlin's Crystal Ball</h1>
                <p style="color: #a1a1aa; margin: 8px 0 0 0; font-size: 14px;">D&D Campaign & Character Manager</p>
              </div>
              <div style="background: #18181b; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #27272a; border-top: none;">
                <h2 style="color: #fafafa; margin-top: 0;">Password Reset Request</h2>
                <p style="color: #d4d4d8;">We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; border: 1px solid #4f46e5;">Reset Your Password</a>
                </div>
                <p style="color: #a1a1aa; font-size: 13px;">Or copy this link in your browser:</p>
                <p style="color: #71717a; font-size: 12px; word-break: break-all; background: #0f0f12; padding: 12px; border-radius: 4px; border-left: 3px solid #6366f1;">${resetUrl}</p>
                <div style="background: #1e1b4b; padding: 16px; border-radius: 6px; border-left: 4px solid #6366f1; margin-top: 20px;">
                  <p style="margin: 0; color: #c7d2fe; font-weight: 600; font-size: 13px;">⏰ This link expires in 24 hours</p>
                </div>
                <p style="color: #a1a1aa; font-size: 12px; margin-top: 20px;">
                  If you didn't request this reset, you can safely ignore this email.
                </p>
              </div>
              <div style="text-align: center; margin-top: 20px; color: #52525b; font-size: 12px;">
                <p style="margin: 4px 0;">© ${new Date().getFullYear()} Merlin's Crystal Ball. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
        text: `Password Reset Request

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link expires in 24 hours.

If you didn't request this reset, you can safely ignore this email.

© ${new Date().getFullYear()} Merlin's Crystal Ball. All rights reserved.`,
      });
    },
    onPasswordReset: async ({ user }) => {
      console.log(`Password for user ${user.email} has been reset.`);
    },
  },
  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
  plugins: [],
  callbacks: {
    async signUpResponse(user: SignUpResponseUser) {
      return {
        user,
      };
    },
  },
});

/**
 * Get the current session from the server
 */
export async function getSession() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}
