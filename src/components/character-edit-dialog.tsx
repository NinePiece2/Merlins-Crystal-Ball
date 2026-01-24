"use client";

import React, { useState, useRef } from "react";
import { Character } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { Upload } from "lucide-react";

interface CharacterEditDialogProps {
  open: boolean;
  character: Character | null;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; profileImage?: Blob }) => Promise<void>;
}

export function CharacterEditDialog({
  open,
  character,
  onOpenChange,
  onSave,
}: CharacterEditDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(character?.name || "");
  const [profileImage, setProfileImage] = useState<string | null>(character?.profileImage || null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (character) {
      setName(character.name);
      setProfileImage(character.profileImage || null);
    }
  }, [character, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToEdit(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    setShowCropDialog(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(croppedImageBlob);
  };

  const handleSave = async () => {
    if (!character) return;

    setLoading(true);
    try {
      // If profileImage is a data URL (not the original), we need to convert it to blob
      let profileImageBlob: Blob | undefined;

      if (profileImage && profileImage.startsWith("data:")) {
        const base64Part = profileImage.split(",")[1];
        const binaryString = atob(base64Part);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        profileImageBlob = new Blob([bytes], { type: "image/jpeg" });
      }

      await onSave({
        name,
        profileImage: profileImageBlob,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving character:", error);
      alert("Failed to save character");
    } finally {
      setLoading(false);
    }
  };

  if (!character) return null;

  return (
    <>
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

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Character</DialogTitle>
            <DialogDescription>
              Update your character&apos;s name and profile picture.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Character Name */}
            <Field>
              <FieldLabel htmlFor="char-name">Character Name</FieldLabel>
              <Input
                id="char-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter character name"
              />
            </Field>

            {/* Profile Picture */}
            <div className="space-y-4">
              <FieldLabel>Profile Picture</FieldLabel>
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileImage || undefined} alt={name} />
                  <AvatarFallback className="text-2xl font-semibold">
                    {name
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="flex items-center gap-2">
                      {loading ? (
                        <>
                          <Spinner className="w-4 h-4" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Choose Image
                        </>
                      )}
                    </span>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
