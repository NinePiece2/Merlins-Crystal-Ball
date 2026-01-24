"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface CharacterLevelUploadProps {
  characterId: string;
  onUploadSuccess?: (data: { level: number; sheetUrl: string }) => void;
}

export function CharacterLevelUpload({ characterId, onUploadSuccess }: CharacterLevelUploadProps) {
  const [level, setLevel] = useState("1");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        setSelectedFile(file);
        setError("");
      } else {
        setError("Please select a PDF or image file");
        setSelectedFile(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    if (!level || parseInt(level) < 1 || parseInt(level) > 20) {
      setError("Level must be between 1 and 20");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("level", level);

      const response = await fetch(`/api/characters/${characterId}/levels`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload character level");
      }

      const result = await response.json();
      setSuccess(`Character level ${level} uploaded successfully!`);
      setSelectedFile(null);
      setLevel("1");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploadSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-xl font-bold">Upload Character Sheet</h3>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
        )}

        {success && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <div>
          <Label htmlFor="level">Character Level *</Label>
          <input
            id="level"
            type="number"
            min="1"
            max="20"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <Label htmlFor="file">Character Sheet (PDF or Image) *</Label>
          <input
            id="file"
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">Selected: {selectedFile.name}</p>
          )}
        </div>

        <Button type="submit" disabled={isLoading || !selectedFile} className="w-full">
          {isLoading ? "Uploading..." : "Upload Character Sheet"}
        </Button>
      </form>
    </Card>
  );
}
