"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { AlertCircle, Upload } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPfp, setUploadingPfp] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pfpPreview, setPfpPreview] = useState<string | null>(session?.user?.image || null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user.name || "",
        email: session.user.email || "",
      }));
      setPfpPreview(session.user.image || null);
    }
  }, [session]);

  const handlePfpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be less than 5MB" });
      return;
    }

    setMessage(null);

    // Read the image and show crop dialog
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToEdit(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setShowCropDialog(false);
    setUploadingPfp(true);

    try {
      const formData = new FormData();
      formData.append("image", croppedImageBlob, "profile-picture.jpg");

      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload profile picture");
      }

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPfpPreview(reader.result as string);
      };
      reader.readAsDataURL(croppedImageBlob);

      setMessage({ type: "success", text: "Profile picture updated successfully" });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload profile picture";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setUploadingPfp(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      // Note: This is a placeholder. You'll need to implement the actual API endpoint
      // for updating user profile information
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.currentPassword) {
      setMessage({ type: "error", text: "Please enter your current password" });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.password,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to change password");
      }

      setMessage({ type: "success", text: "Password changed successfully" });
      setFormData((prev) => ({ ...prev, currentPassword: "", password: "", confirmPassword: "" }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <Card className="p-8 text-center">
          <p className="mb-4">Please log in to view settings</p>
          <Button onClick={() => (window.location.href = "/login")}>Log In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-linear-to-b from-background via-background to-secondary/5">
      {imageToEdit && (
        <ImageCropDialog
          open={showCropDialog}
          imageSrc={imageToEdit}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropDialog(false);
            setImageToEdit(null);
          }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">Settings</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        {message && (
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Profile Section */}
        <Card className="p-8 border border-primary/10">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Profile Information</h2>

          {/* Profile Picture Upload */}
          <div className="mb-8 pb-8 border-b border-border">
            <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={pfpPreview || undefined} alt={session?.user?.name || "User"} />
                <AvatarFallback className="text-2xl font-semibold">
                  {(session?.user?.name || session?.user?.email || "U")
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePfpChange}
                    disabled={uploadingPfp}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingPfp}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="flex items-center gap-2">
                      {uploadingPfp ? (
                        <>
                          <Spinner className="w-4 h-4" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Choose Image
                        </>
                      )}
                    </span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </Field>

              <Field orientation="horizontal">
                <Button type="submit" disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" /> Saving...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </Card>

        {/* Password Section */}
        <Card className="p-8 border border-primary/10">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Change Password</h2>
          <form onSubmit={handleChangePassword}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter your current password"
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">New Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password (minimum 8 characters)"
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  disabled={loading}
                />
              </Field>

              <Field orientation="horizontal">
                <Button type="submit" disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" /> Updating...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </Card>

        {/* Danger Zone */}
        {/* <Card className="p-8 border-2 border-destructive/20 bg-destructive/5">
          <h2 className="text-2xl font-bold tracking-tight text-destructive mb-3">Danger Zone</h2>
          <p className="text-base text-destructive/80 mb-6">
            Deleting your account is permanent and cannot be undone. All your characters and
            campaigns will be deleted.
          </p>
          <Button variant="destructive" disabled={loading} size="lg">
            Delete Account
          </Button>
        </Card> */}
      </div>
    </div>
  );
}
