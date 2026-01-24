"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { CharacterSheetDisplay } from "@/components/character-sheet-display";
import { type CharacterSheetData } from "@/components/character-sheet-display";

interface CharacterSheetViewerDialogProps {
  isOpen: boolean;
  characterId: string;
  level: number;
  characterName: string;
  onOpenChange: (open: boolean) => void;
}

export function CharacterSheetViewerDialog({
  isOpen,
  characterId,
  level,
  characterName,
  onOpenChange,
}: CharacterSheetViewerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characterData, setCharacterData] = useState<CharacterSheetData | null>(null);

  const handleDownload = (charId: string, charLevel: number) => {
    // Open the PDF download endpoint
    window.location.href = `/api/characters/${charId}/levels/${charLevel}/pdf`;
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchCharacterData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/characters/${characterId}/levels/${level}`);

        if (!response.ok) {
          throw new Error("Failed to fetch character data");
        }

        const data = await response.json();

        // Merge character info with extracted data
        const mergedData: CharacterSheetData = {
          characterName: data.character.characterName,
          playerName: data.character.playerName,
          race: data.character.race,
          class: data.character.class,
          background: data.character.background,
          ...data.extractedData,
        };

        setCharacterData(mergedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load character data");
      } finally {
        setLoading(false);
      }
    };

    fetchCharacterData();
  }, [isOpen, characterId, level]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[80vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 py-4 border-b">
          <DialogTitle>
            {characterName} - Level {level}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
          )}

          {characterData && !loading && (
            <CharacterSheetDisplay
              data={characterData}
              characterId={characterId}
              level={level}
              onDownload={handleDownload}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
