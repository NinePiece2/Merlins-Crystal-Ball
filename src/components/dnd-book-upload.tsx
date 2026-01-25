"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, AlertCircle, X, FileText, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DocumentToUpload {
  file: File;
  title: string;
  description: string;
}

interface DocumentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: DocumentToUpload) => Promise<void>;
  isLoading?: boolean;
}

export function DocumentUpload({
  open,
  onOpenChange,
  onUpload,
  isLoading = false,
}: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadProgressByFile, setUploadProgressByFile] = useState<Record<string, number>>({});
  const [uploadMode, setUploadMode] = useState<"single" | "multi">("single");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<DocumentToUpload[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE_MB = 5000; // 5GB

  const extractTitleFromFilename = (filename: string): string => {
    return filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const validFiles: File[] = [];
      let errorMsg = "";

      Array.from(selectedFiles).forEach((file) => {
        if (file.type !== "application/pdf") {
          errorMsg = "Only PDF files are supported";
          return;
        }

        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          errorMsg = `File size must be less than ${MAX_FILE_SIZE_MB}MB`;
          return;
        }

        validFiles.push(file);
      });

      if (errorMsg) {
        setError(errorMsg);
        return;
      }

      if (uploadMode === "single") {
        if (validFiles.length > 1) {
          setError("Single upload mode only accepts one file");
          return;
        }
        if (validFiles.length === 1) {
          setSingleFile(validFiles[0]);
          setTitle(extractTitleFromFilename(validFiles[0].name));
        }
      } else {
        setFiles(validFiles);
        // Prepare confirmation data for multi-upload
        if (validFiles.length > 0) {
          const confirmData = validFiles.map((file) => ({
            file,
            title: extractTitleFromFilename(file.name),
            description: "",
          }));
          setConfirmationData(confirmData);
          setShowConfirmation(true);
        }
      }

      setError("");
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!singleFile || !title.trim()) {
      setError("Please select a file and enter a title");
      return;
    }

    setUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      await onUpload({
        title: title.trim(),
        description: description.trim(),
        file: singleFile,
      });

      // Reset form
      setSingleFile(null);
      setTitle("");
      setDescription("");
      setUploadProgress(0);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmMultiUpload = async () => {
    setShowConfirmation(false);
    setUploading(true);
    setError("");
    setUploadProgressByFile({});

    let completed = 0;
    const total = confirmationData.length;

    try {
      for (let i = 0; i < confirmationData.length; i++) {
        const doc = confirmationData[i];
        const fileKey = `file-${i}`;

        // Initialize progress for this file
        setUploadProgressByFile((prev) => ({ ...prev, [fileKey]: 0 }));

        await onUpload(doc);

        // Mark file as complete
        completed++;
        setUploadProgressByFile((prev) => ({ ...prev, [fileKey]: 100 }));
        setUploadProgress(Math.round((completed / total) * 100));
      }

      // Reset form
      setFiles([]);
      setConfirmationData([]);
      setUploadProgress(0);
      setUploadProgressByFile({});
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleEditTitle = (index: number, newTitle: string) => {
    const updated = [...confirmationData];
    updated[index].title = newTitle;
    setConfirmationData(updated);
  };

  const handleEditDescription = (index: number, newDescription: string) => {
    const updated = [...confirmationData];
    updated[index].description = newDescription;
    setConfirmationData(updated);
  };

  const handleRemoveFile = (index: number) => {
    setConfirmationData(confirmationData.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (!uploading && !showConfirmation) {
      setSingleFile(null);
      setFiles([]);
      setTitle("");
      setDescription("");
      setError("");
      setUploadProgress(0);
      setUploadMode("single");
      setConfirmationData([]);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              Upload PDF documents for all users to view. Maximum file size: 5GB per file
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={uploadMode === "single" ? "default" : "outline"}
              onClick={() => {
                setUploadMode("single");
                setFiles([]);
                setConfirmationData([]);
                setError("");
              }}
              className="flex-1"
            >
              Single Upload
            </Button>
            <Button
              type="button"
              variant={uploadMode === "multi" ? "default" : "outline"}
              onClick={() => {
                setUploadMode("multi");
                setSingleFile(null);
                setTitle("");
                setDescription("");
                setError("");
              }}
              className="flex-1"
            >
              Mass Upload
            </Button>
          </div>

          {uploadMode === "single" ? (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Title</label>
                <Input
                  type="text"
                  placeholder="e.g., Player's Handbook"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={uploading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  placeholder="Brief description of the document..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={uploading}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">PDF File</label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />

                  {singleFile ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{singleFile.name}</div>
                      <div className="text-xs text-gray-500">
                        {(singleFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <div className="text-sm text-gray-600">Click to browse or drag and drop</div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {uploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading || isLoading || !singleFile || !title}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          ) : (
            <form className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">PDF Files</label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />

                  {files.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{files.length} file(s) selected</div>
                      <div className="text-xs text-gray-500">
                        Total size:{" "}
                        {(files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <div className="text-sm text-gray-600">
                        Click to browse or drag and drop multiple PDFs
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={uploading || confirmationData.length === 0}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (files.length > 0) {
                      const confirmData = files.map((file) => ({
                        file,
                        title: extractTitleFromFilename(file.name),
                        description: "",
                      }));
                      setConfirmationData(confirmData);
                      setShowConfirmation(true);
                    }
                  }}
                  disabled={uploading || files.length === 0}
                >
                  {files.length === 0 ? "Select Files" : `Review ${files.length} File(s)`}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showConfirmation}
        onOpenChange={(open) => {
          if (!uploading) {
            setShowConfirmation(open);
          }
        }}
      >
        <AlertDialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Confirm Document Names</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Review and customize the information for {confirmationData.length} document(s). Click
              on any field to edit.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Separator />

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {confirmationData.map((doc, index) => (
                <Card
                  key={index}
                  className="p-4 border hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => {
                    setEditingIndex(index);
                    setEditingTitle(doc.title);
                    setEditingDescription(doc.description);
                  }}
                >
                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Document Title
                        </label>
                        <Input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => {
                            handleEditTitle(index, editingTitle);
                            setEditingIndex(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleEditTitle(index, editingTitle);
                              setEditingIndex(null);
                            }
                            if (e.key === "Escape") {
                              setEditingIndex(null);
                            }
                          }}
                          placeholder="Document title"
                          autoFocus
                          className="font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Description (Optional)
                        </label>
                        <Textarea
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          onBlur={() => {
                            handleEditDescription(index, editingDescription);
                            setEditingIndex(null);
                          }}
                          rows={2}
                          placeholder="Add a brief description..."
                          className="resize-none"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIndex(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTitle(index, editingTitle);
                            handleEditDescription(index, editingDescription);
                            setEditingIndex(null);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <h3 className="text-sm font-semibold truncate group-hover:text-primary transition">
                            {doc.title}
                          </h3>
                          <Badge variant="secondary" className="shrink-0">
                            {(doc.file.size / (1024 * 1024)).toFixed(2)} MB
                          </Badge>
                        </div>

                        {doc.description && (
                          <p className="text-sm text-muted-foreground pl-6">{doc.description}</p>
                        )}

                        <p className="text-xs text-muted-foreground pl-6 truncate">
                          {doc.file.name}
                        </p>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIndex(index);
                            setEditingTitle(doc.title);
                            setEditingDescription(doc.description);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                          className="text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                          title="Delete"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>

          {error && (
            <>
              <Separator />
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            </>
          )}

          {uploading && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Uploading {confirmationData.length} document(s)...
                  </span>
                  <Badge variant="default">{Math.round(uploadProgress)}%</Badge>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {confirmationData.map((doc, index) => {
                    const fileKey = `file-${index}`;
                    const fileProgress = uploadProgressByFile[fileKey] || 0;
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {doc.title}
                            </span>
                          </div>
                          <span className="text-xs font-medium tabular-nums shrink-0">
                            {fileProgress}%
                          </span>
                        </div>
                        <Progress value={fileProgress} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!uploading) {
                  setShowConfirmation(false);
                }
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <AlertDialogAction
              onClick={handleConfirmMultiUpload}
              disabled={uploading || confirmationData.length === 0}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload {confirmationData.length} Document(s)
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
