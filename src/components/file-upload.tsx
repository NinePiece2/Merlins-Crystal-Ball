"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Upload, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FileUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, level: number) => Promise<void>;
  isLoading?: boolean;
  defaultLevel?: number;
  existingLevels?: number[];
}

export function FileUpload({
  open,
  onOpenChange,
  onUpload,
  isLoading = false,
  defaultLevel = 1,
  existingLevels = [],
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<string>(defaultLevel.toString());
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; level: number } | null>(null);

  // Update level when dialog opens or defaultLevel changes
  useEffect(() => {
    if (open) {
      setLevel(defaultLevel.toString());
    }
  }, [open, defaultLevel]);

  // Clean up form when dialog closes
  useEffect(() => {
    if (!open) {
      setFile(null);
      setLevel(defaultLevel.toString());
      setError("");
      setUploadProgress(0);
      setUploading(false);
    }
  }, [open, defaultLevel]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!["application/pdf", "image/png", "image/jpeg"].includes(selectedFile.type)) {
        setError("Only PDF and image files are supported");
        setFile(null);
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        setFile(null);
        return;
      }

      setError("");
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    const selectedLevel = parseInt(level, 10);

    // Check if level already exists
    if (existingLevels.includes(selectedLevel)) {
      setPendingUpload({ file, level: selectedLevel });
      setShowConfirmOverwrite(true);
      return;
    }

    await performUpload(file, selectedLevel);
  };

  const performUpload = async (uploadFile: File, uploadLevel: number) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + Math.random() * 30, 90));
      }, 200);

      await onUpload(uploadFile, uploadLevel);
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Parent will close dialog and reset state
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload file";
      setError(errorMessage);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Upload Character Sheet</DialogTitle>
            <DialogDescription>
              Add a character sheet for a specific level. This will overwrite any existing file for
              this level.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="py-4">
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel htmlFor="level">Character Level *</FieldLabel>
                <Select value={level} onValueChange={(value) => value && setLevel(value)}>
                  <SelectTrigger id="level">
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
                        <SelectItem key={lvl} value={lvl.toString()}>
                          Level {lvl}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <div className="flex items-center gap-2 mb-2">
                  <FieldLabel htmlFor="file">PDF or Image File *</FieldLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center cursor-help font-semibold">
                          ?
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upload PDF or image files (max 10MB)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    id="file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    disabled={uploading || isLoading}
                    className="hidden"
                  />
                  <label htmlFor="file" className="cursor-pointer block">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {file ? file.name : "Click to select or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF or image (PNG, JPG) up to 10MB
                    </p>
                  </label>
                </div>
              </Field>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Uploading...</span>
                    <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </FieldGroup>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={uploading}>
                Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmOverwrite} onOpenChange={setShowConfirmOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite Level {level}?</AlertDialogTitle>
            <AlertDialogDescription>
              A character sheet for Level {level} already exists. Do you want to replace it with the
              new file?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowConfirmOverwrite(false);
                if (pendingUpload) {
                  await performUpload(pendingUpload.file, pendingUpload.level);
                  setPendingUpload(null);
                }
              }}
            >
              Overwrite
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
