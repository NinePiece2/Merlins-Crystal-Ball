"use client";

import React from "react";
import { CharacterForm } from "@/components/character-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CharacterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; profileImage?: File; campaignId: string }) => Promise<void>;
  isLoading?: boolean;
}

export function CharacterFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CharacterFormDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Character</DialogTitle>
          <DialogDescription className="text-base">
            Add a new character to your collection. Select a campaign to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CharacterForm
            onSubmit={async (data) => {
              await onSubmit(data);
              handleClose();
            }}
            onCancel={handleClose}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
