"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Shield, Zap, Heart, Eye } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CharacterSheetViewerDialog } from "@/components/character-sheet-viewer-dialog";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { data: session } = useSession();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<{
    campaign: { name: string; description?: string };
    party: Array<{
      characterId: string;
      character?: { name: string; race: string; class: string };
      levels: Array<{ level: number; extractedData?: Record<string, unknown> }>;
    }>;
  } | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string>("");

  useEffect(() => {
    params.then((p) => setCampaignId(p.campaignId));
  }, [params]);

  const fetchCampaign = useCallback(async () => {
    if (!campaignId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) throw new Error("Failed to fetch campaign");
      const data = await response.json();
      setCampaign(data);
    } catch (error) {
      console.error("Error fetching campaign:", error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const fetchPreference = useCallback(async () => {
    if (!campaignId) return;
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/preference`);
      if (response.ok) {
        const data = await response.json();
        setSelectedLevel(data.selectedLevel || 1);
      }
    } catch (error) {
      console.error("Error fetching preference:", error);
    }
  }, [campaignId]);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
      fetchPreference();
    }
  }, [campaignId, fetchCampaign, fetchPreference]);

  const handleLevelChange = async (newLevel: number) => {
    setSelectedLevel(newLevel);
    if (campaignId) {
      try {
        await fetch(`/api/campaigns/${campaignId}/preference`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedLevel: newLevel }),
        });
      } catch (error) {
        console.error("Error saving preference:", error);
      }
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <Card className="p-8 text-center">
          <p className="mb-4">Please log in to view campaigns</p>
          <Button onClick={() => (window.location.href = "/login")}>Log In</Button>
        </Card>
      </div>
    );
  }

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  // Get all unique levels from party members
  const allLevels = new Set<number>();
  campaign.party.forEach((member: { characterId: string; levels: Array<{ level: number }> }) => {
    member.levels.forEach((level: { level: number }) => {
      allLevels.add(level.level);
    });
  });
  // Always show levels 1-20, even if no characters have levels yet
  const levelArray = Array.from(
    allLevels.size > 0 ? allLevels : Array.from({ length: 20 }, (_, i) => i + 1),
  ).sort((a, b) => a - b);

  // Filter party members to only show those with the selected level
  const partAtLevel = campaign.party.filter(
    (member: { characterId: string; levels: Array<{ level: number }> }) =>
      member.levels.some((l: { level: number }) => l.level === selectedLevel),
  );

  const missingAtLevel = campaign.party.filter(
    (member: { characterId: string; levels: Array<{ level: number }> }) =>
      !member.levels.some((l: { level: number }) => l.level === selectedLevel),
  );

  return (
    <div className="min-h-[calc(100vh-65px)] bg-linear-to-b from-background via-background to-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">{campaign.campaign.name}</h1>
            <p className="text-lg text-muted-foreground mt-2">
              {campaign.party.length} character{campaign.party.length !== 1 ? "s" : ""} in party
            </p>
          </div>
          {/* <Button
            onClick={() => setShowAddCharacter(!showAddCharacter)}
            className="gap-2"
            size="lg"
          >
            <Plus className="w-5 h-5" /> Add Character
          </Button> */}
        </div>

        {/* Level Selector */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h2 className="font-semibold">Select Character Level</h2>
              <p className="text-sm text-muted-foreground">
                View party members at a specific level
              </p>
            </div>
            <Select
              value={selectedLevel.toString()}
              onValueChange={(value) => value && handleLevelChange(parseInt(value, 10))}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {levelArray.map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      Level {level}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Characters at selected level */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Party Members</h2>

          {partAtLevel.length === 0 && missingAtLevel.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No characters in this campaign yet</p>
            </Card>
          ) : (
            <>
              {partAtLevel.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {partAtLevel.map(
                    (member: {
                      characterId: string;
                      character?: { name: string; race: string; class: string };
                      levels: Array<{ level: number; extractedData?: Record<string, unknown> }>;
                    }) => {
                      const levelData = member.levels.find(
                        (l: { level: number }) => l.level === selectedLevel,
                      );
                      const extracted = (levelData?.extractedData || {}) as Record<string, unknown>;
                      const hasData = extracted && Object.keys(extracted).length > 0;

                      // Helper to safely convert to number
                      const toNum = (val: unknown): number => {
                        const n = Number(val);
                        return isNaN(n) ? 0 : n;
                      };

                      // Helper to calculate modifier
                      const getMod = (score: unknown): number =>
                        Math.floor((toNum(score) - 10) / 2);

                      return (
                        <Card
                          key={member.characterId}
                          className="p-6 bg-linear-to-br from-amber-950 via-slate-900 to-slate-800 border-amber-700/50 text-white hover:border-amber-700 transition-colors"
                        >
                          {/* Header with Avatar */}
                          <div className="flex justify-between items-start mb-4 pb-4 border-b border-amber-700/30 gap-4">
                            <div className="flex gap-3 flex-1">
                              <Avatar className="w-12 h-12 shrink-0">
                                <AvatarImage
                                  src={
                                    (member.character as unknown as { profileImage?: string })
                                      ?.profileImage || undefined
                                  }
                                  alt={member.character?.name}
                                  className="object-cover"
                                />
                                <AvatarFallback className="text-xs font-bold bg-amber-700 text-white">
                                  {member.character?.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-amber-100">
                                  {member.character?.name}
                                </h3>
                                <p className="text-sm text-amber-100/70">
                                  {member.character?.race} {member.character?.class}
                                </p>
                              </div>
                            </div>
                            <Badge className="bg-amber-700 text-white shrink-0">
                              Lvl {selectedLevel}
                            </Badge>
                          </div>

                          {hasData ? (
                            <div className="space-y-3">
                              {/* Core Stats Row */}
                              <div className="grid grid-cols-3 gap-2">
                                {/* HP */}
                                <div className="bg-red-900/40 rounded p-2 border border-red-700/50">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Heart className="w-3 h-3 text-red-400" />
                                    <span className="text-xs text-red-300">HP</span>
                                  </div>
                                  <div className="text-lg font-bold text-red-100">
                                    {toNum(extracted.currentHP) || toNum(extracted.maxHP) || "—"}
                                    <span className="text-xs text-red-300">
                                      /{toNum(extracted.maxHP) || "—"}
                                    </span>
                                  </div>
                                </div>

                                {/* AC */}
                                <div className="bg-blue-900/40 rounded p-2 border border-blue-700/50">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Shield className="w-3 h-3 text-blue-400" />
                                    <span className="text-xs text-blue-300">AC</span>
                                  </div>
                                  <div className="text-lg font-bold text-blue-100">
                                    {toNum(extracted.ac) || "—"}
                                  </div>
                                </div>

                                {/* Initiative */}
                                <div className="bg-purple-900/40 rounded p-2 border border-purple-700/50">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Zap className="w-3 h-3 text-purple-400" />
                                    <span className="text-xs text-purple-300">Init</span>
                                  </div>
                                  <div className="text-lg font-bold text-purple-100">
                                    {extracted.initiative
                                      ? (toNum(extracted.initiative) >= 0 ? "+" : "") +
                                        toNum(extracted.initiative)
                                      : "—"}
                                  </div>
                                </div>
                              </div>

                              {/* Proficiency & Speed */}
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {extracted.proficiencyBonus ? (
                                  <div className="bg-amber-900/30 rounded p-2 border border-amber-700/30">
                                    <span className="text-amber-200/70">Prof Bonus</span>
                                    <div className="font-semibold text-amber-100">
                                      {toNum(extracted.proficiencyBonus) >= 0 ? "+" : ""}
                                      {toNum(extracted.proficiencyBonus)}
                                    </div>
                                  </div>
                                ) : null}
                                {extracted.speed ? (
                                  <div className="bg-amber-900/30 rounded p-2 border border-amber-700/30">
                                    <span className="text-amber-200/70">Speed</span>
                                    <div className="font-semibold text-amber-100">
                                      {String(extracted.speed)} ft
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              {/* Ability Scores */}
                              {extracted.strength ||
                              extracted.dexterity ||
                              extracted.constitution ||
                              extracted.intelligence ||
                              extracted.wisdom ||
                              extracted.charisma ? (
                                <div className="bg-slate-700/40 rounded p-3 border border-slate-600/50">
                                  <div className="text-xs font-semibold text-amber-200 mb-2">
                                    ABILITY SCORES
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    {(
                                      [
                                        ["STR", extracted.strength] as const,
                                        ["DEX", extracted.dexterity] as const,
                                        ["CON", extracted.constitution] as const,
                                        ["INT", extracted.intelligence] as const,
                                        ["WIS", extracted.wisdom] as const,
                                        ["CHA", extracted.charisma] as const,
                                      ] as const
                                    ).map(([abbr, score]) =>
                                      score ? (
                                        <div key={abbr} className="text-center">
                                          <div className="text-slate-300">{abbr}</div>
                                          <div className="font-bold text-amber-100">
                                            {toNum(score)}
                                          </div>
                                          <div className="text-slate-400">
                                            {getMod(score) >= 0 ? "+" : ""}
                                            {getMod(score)}
                                          </div>
                                        </div>
                                      ) : null,
                                    )}
                                  </div>
                                </div>
                              ) : null}

                              {/* Resistances/Immunities */}
                              {extracted.resistances || extracted.immunities ? (
                                <div className="bg-slate-700/40 rounded p-3 border border-slate-600/50 text-xs space-y-1">
                                  {extracted.resistances ? (
                                    <div>
                                      <span className="text-amber-200 font-semibold">
                                        Resistances:
                                      </span>
                                      <div className="text-slate-300">
                                        {String(extracted.resistances)}
                                      </div>
                                    </div>
                                  ) : null}
                                  {extracted.immunities ? (
                                    <div>
                                      <span className="text-amber-200 font-semibold">
                                        Immunities:
                                      </span>
                                      <div className="text-slate-300">
                                        {String(extracted.immunities)}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {/* Senses and Special Abilities */}
                              {extracted.senses ||
                              extracted.languages ||
                              extracted.specialAbilities ||
                              extracted.damageResistances ? (
                                <div className="bg-slate-700/40 rounded p-3 border border-slate-600/50 text-xs space-y-1">
                                  {extracted.senses ? (
                                    <div>
                                      <span className="text-amber-200 font-semibold">Senses:</span>
                                      <div className="text-slate-300">
                                        {typeof extracted.senses === "object"
                                          ? Object.values(
                                              extracted.senses as Record<string, unknown>,
                                            )
                                              .map((value) => String(value))
                                              .join(", ")
                                          : String(extracted.senses)}
                                      </div>
                                    </div>
                                  ) : null}
                                  {extracted.damageResistances ? (
                                    <div>
                                      <span className="text-amber-200 font-semibold">
                                        Damage Resistances:
                                      </span>
                                      <div className="text-slate-300">
                                        {String(extracted.damageResistances)}
                                      </div>
                                    </div>
                                  ) : null}
                                  {extracted.languages ? (
                                    <div>
                                      <span className="text-amber-200 font-semibold">
                                        Languages:
                                      </span>
                                      <div className="text-slate-300">
                                        {String(extracted.languages)}
                                      </div>
                                    </div>
                                  ) : null}
                                  {extracted.specialAbilities ? (
                                    <div>
                                      <span className="text-amber-200 font-semibold">
                                        Special Abilities:
                                      </span>
                                      <div className="text-slate-300 line-clamp-2">
                                        {String(extracted.specialAbilities).substring(0, 100)}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-400 py-4">
                              No character sheet uploaded for this level yet
                            </div>
                          )}
                          {/* View Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-4 border-amber-700/50 text-amber-100 hover:bg-amber-700/20"
                            onClick={() => {
                              setSelectedCharacterId(member.characterId);
                              setSelectedCharacterName(member.character?.name || "Character");
                              setViewerOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Full Character Sheet
                          </Button>
                        </Card>
                      );
                    },
                  )}
                </div>
              )}

              {/* Show missing members */}
              {missingAtLevel.length > 0 && (
                <Card className="p-6 border-orange-200 bg-orange-50">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-orange-900 mb-2">
                        Missing Characters for Level {selectedLevel}
                      </h3>
                      <p className="text-sm text-orange-800 mb-4">
                        The following characters don&apos;t have data for level {selectedLevel}:
                      </p>
                      <div className="space-y-1">
                        {missingAtLevel.map(
                          (member: {
                            characterId: string;
                            character?: { name: string; race: string; class: string };
                          }) => (
                            <div key={member.characterId} className="text-sm text-orange-800">
                              • {member.character?.name} ({member.character?.race}{" "}
                              {member.character?.class})
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {selectedCharacterId && (
        <CharacterSheetViewerDialog
          isOpen={viewerOpen}
          characterId={selectedCharacterId}
          level={selectedLevel}
          characterName={selectedCharacterName}
          onOpenChange={setViewerOpen}
        />
      )}
    </div>
  );
}
