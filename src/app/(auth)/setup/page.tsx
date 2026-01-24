"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const checkSetupStatus = useCallback(async () => {
    try {
      // Check if setup_complete cookie exists
      const hasCookie = document.cookie.includes("setup_complete");
      if (hasCookie) {
        router.push("/");
        return;
      }

      const response = await fetch("/api/setup/status");
      const data = await response.json();

      if (!data.needsSetup) {
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to check setup status:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const initializeSetup = async () => {
      await checkSetupStatus();
    };
    initializeSetup();
  }, [checkSetupStatus]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Failed to create admin account");
        return;
      }

      // Redirect to login after successful account creation
      router.push("/login");
    } catch (err) {
      setError("An error occurred during setup");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-secondary/20">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-secondary/20">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Initial Setup</h1>
          <p className="text-sm text-muted-foreground">Create your admin account</p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Admin Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={creating}>
            {creating ? "Creating Admin Account..." : "Create Admin Account"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          This admin account will have full access to manage the application.
        </p>
      </Card>
    </div>
  );
}
