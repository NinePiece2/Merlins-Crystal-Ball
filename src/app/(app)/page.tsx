"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CharacterFormDialog } from "@/components/character-form-dialog";
import { CharacterEditDialog } from "@/components/character-edit-dialog";
import { CharacterGrid, type CharacterWithLevels } from "@/components/character-grid";
import { FileUpload } from "@/components/file-upload";
import { Plus } from "lucide-react";

export default function HomePage() {
  const { data: session } = useSession();
  const [characters, setCharacters] = useState<CharacterWithLevels[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterWithLevels | null>(null);
  const [showLevelUpload, setShowLevelUpload] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [uploadingLevels, setUploadingLevels] = useState<Set<string>>(new Set());

  // Fetch characters on mount
  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/characters");
      if (!response.ok) throw new Error("Failed to fetch characters");
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error("Error fetching characters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = async (formData: {
    name: string;
    profileImage?: File;
    campaignId?: string;
  }) => {
    try {
      const data = new FormData();
      data.append("name", formData.name);
      if (formData.profileImage) {
        data.append("profileImage", formData.profileImage);
      }
      if (formData.campaignId) {
        data.append("campaignId", formData.campaignId);
      }

      const response = await fetch("/api/characters", {
        method: "POST",
        body: data,
      });

      if (!response.ok) throw new Error("Failed to create character");

      await fetchCharacters();
      setShowForm(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message || "Failed to create character");
      }
      throw new Error("Failed to create character");
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete character");
      await fetchCharacters();
    } catch (error) {
      console.error("Error deleting character:", error);
    }
  };

  const handleUploadLevel = async (characterId: string, file: File, level: number) => {
    try {
      setUploadingLevels((prev) => new Set([...prev, characterId]));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("level", level.toString());

      const response = await fetch(`/api/characters/${characterId}/levels`, {
        method: "POST",
        body: formData,
      } as RequestInit);

      if (!response.ok) throw new Error("Failed to upload level");

      // Close dialog first before fetching new data
      setShowLevelUpload(false);
      setSelectedCharacterId(null);

      // Fetch characters after dialog is closed
      await fetchCharacters();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Failed to upload level";
      throw new Error(errorMsg);
    } finally {
      setUploadingLevels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(characterId);
        return newSet;
      });
    }
  };

  const handleSelectLevel = (characterId: string, level: number) => {
    // Open the PDF in a new window with the browser's PDF viewer
    window.open(`/api/characters/${characterId}/levels/${level}/pdf`, "_blank");
  };

  const handleDeleteLevel = async (characterId: string, level: number) => {
    try {
      const response = await fetch(`/api/characters/${characterId}/levels/${level}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete level");

      await fetchCharacters();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Failed to delete level";
      console.error("Error deleting level:", errorMsg);
    }
  };

  const getDefaultLevel = (chars: CharacterWithLevels[], characterId: string | null): number => {
    if (!characterId) return 1;
    const character = chars.find((c) => c.id === characterId);
    if (!character || !character.levels || character.levels.length === 0) return 1;

    // Find the highest level
    const maxLevel = Math.max(...character.levels.map((l: { level: number }) => l.level));

    // Return next level, capped at 20
    return Math.min(maxLevel + 1, 20);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <Card className="p-8 text-center">
          <p className="mb-4">Please log in to view your characters</p>
          <Button onClick={() => (window.location.href = "/login")}>Log In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-linear-to-b from-background via-background to-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">Your Characters</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Manage your D&amp;D characters and their levels
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            New Character
          </Button>
        </div>

        <CharacterFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          onSubmit={handleCreateCharacter}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : (
          <>
            <CharacterGrid
              characters={characters}
              onAddLevel={(characterId) => {
                setSelectedCharacterId(characterId);
                setShowLevelUpload(true);
              }}
              onDeleteCharacter={handleDeleteCharacter}
              onDeleteLevel={handleDeleteLevel}
              onSelectLevel={handleSelectLevel}
              onEditCharacter={(character) => {
                setSelectedCharacter(character);
                setShowEditDialog(true);
              }}
            />

            <FileUpload
              open={showLevelUpload}
              onOpenChange={setShowLevelUpload}
              onUpload={(file, level) => handleUploadLevel(selectedCharacterId || "", file, level)}
              isLoading={selectedCharacterId ? uploadingLevels.has(selectedCharacterId) : false}
              defaultLevel={getDefaultLevel(characters, selectedCharacterId)}
              existingLevels={
                selectedCharacterId
                  ? characters
                      .find((c) => c.id === selectedCharacterId)
                      ?.levels.map((l) => l.level) || []
                  : []
              }
            />
          </>
        )}
      </div>

      <CharacterEditDialog
        open={showEditDialog}
        character={selectedCharacter}
        onOpenChange={setShowEditDialog}
        onSave={async (data) => {
          if (!selectedCharacter) return;

          try {
            const formData = new FormData();
            formData.append("name", data.name);
            if (data.profileImage) {
              formData.append("profileImage", data.profileImage);
            }

            const response = await fetch(`/api/characters/${selectedCharacter.id}`, {
              method: "PATCH",
              body: formData,
            });

            if (!response.ok) throw new Error("Failed to update character");

            await fetchCharacters();
            setShowEditDialog(false);
            setSelectedCharacter(null);
          } catch (error) {
            console.error("Error updating character:", error);
            throw error;
          }
        }}
      />
    </div>
  );
}
