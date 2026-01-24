"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Character, CharacterLevel } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Download, Plus, Edit, Eye } from "lucide-react";
import { CharacterSheetViewerDialog } from "@/components/character-sheet-viewer-dialog";

export interface CharacterWithLevels extends Character {
  levels: CharacterLevel[];
}

interface CharacterGridProps {
  characters: CharacterWithLevels[];
  onAddLevel: (characterId: string) => void;
  onDeleteCharacter: (characterId: string) => void;
  onDeleteLevel?: (characterId: string, level: number) => void;
  onSelectLevel: (characterId: string, level: number) => void;
  onEditCharacter?: (character: CharacterWithLevels) => void;
}

export function CharacterGrid({
  characters,
  onAddLevel,
  onDeleteCharacter,
  onDeleteLevel,
  onSelectLevel,
  onEditCharacter,
}: CharacterGridProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string>("");

  const handleViewLevel = (characterId: string, level: number, characterName: string) => {
    setSelectedCharacterId(characterId);
    setSelectedLevel(level);
    setSelectedCharacterName(characterName);
    setViewerOpen(true);
  };

  if (characters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No characters yet. Create your first character!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((character) => (
          <Card key={character.id} className="overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{character.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {character.race} {character.class}
                  </p>
                </div>
                <HoverCard>
                  <HoverCardTrigger>
                    <div className="cursor-pointer">
                      <Avatar className="w-16 h-16">
                        <AvatarImage
                          src={character.profileImage || undefined}
                          alt={character.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-xs font-semibold">
                          {character.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64">
                    <div className="space-y-2">
                      {character.profileImage && (
                        <div className="relative w-full h-40 rounded-md overflow-hidden">
                          <Image
                            src={character.profileImage}
                            alt={`${character.name} profile`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm">{character.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {character.race} {character.class}
                        </p>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>

              {character.background && (
                <p className="text-sm text-muted-foreground mb-4">{character.background}</p>
              )}

              {/* Levels Section */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold">Levels</h4>
                  <Badge variant="outline">{character.levels.length}</Badge>
                </div>

                {character.levels.length > 0 ? (
                  <ScrollArea className={character.levels.length > 4 ? "h-48" : "h-auto"}>
                    <div className="space-y-2 pr-4">
                      {character.levels.map((level) => (
                        <div
                          key={level.id}
                          className="flex justify-between items-center p-2 bg-secondary/20 rounded-md text-sm"
                        >
                          <span>Level {level.level}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View character sheet"
                              onClick={() =>
                                handleViewLevel(character.id, level.level, character.name)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSelectLevel(character.id, level.level)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {onDeleteLevel && (
                              <AlertDialog>
                                <AlertDialogTrigger>
                                  <Button variant="ghost" size="sm" className="text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Level {level.level}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete Level {level.level} for{" "}
                                      {character.name}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogAction
                                    onClick={() => onDeleteLevel(character.id, level.level)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">No levels uploaded yet</p>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onAddLevel(character.id)}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Level
                </Button>
              </div>

              <div className="flex gap-2">
                {onEditCharacter && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onEditCharacter(character)}
                  >
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger className={onEditCharacter ? "flex-1" : "w-full"}>
                    <Button variant="destructive" size="sm" className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Character</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {character.name}? This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogAction onClick={() => onDeleteCharacter(character.id)}>
                      Delete
                    </AlertDialogAction>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedCharacterId && selectedLevel && (
        <CharacterSheetViewerDialog
          isOpen={viewerOpen}
          characterId={selectedCharacterId}
          level={selectedLevel}
          characterName={selectedCharacterName}
          onOpenChange={setViewerOpen}
        />
      )}
    </>
  );
}
