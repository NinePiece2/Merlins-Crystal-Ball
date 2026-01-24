import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const { useSession, signOut } = authClient;

// Password reset - using Better Auth's built-in methods
export async function requestPasswordReset(email: string, redirectUrl?: string) {
  return authClient.requestPasswordReset({
    email,
    redirectTo: redirectUrl,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return authClient.resetPassword({
    token,
    newPassword,
  });
}
