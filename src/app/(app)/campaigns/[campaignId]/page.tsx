"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Shield, Zap, Heart, Eye, Download } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
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
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(["abilityScores", "resistances", "senses"]),
  );

  const availableSections = [
    { id: "abilityScores", label: "Ability Scores" },
    { id: "resistances", label: "Resistances/Immunities" },
    { id: "senses", label: "Senses & Special Abilities" },
  ];

  const toggleSection = (sectionId: string) => {
    const newSections = new Set(visibleSections);
    if (newSections.has(sectionId)) {
      newSections.delete(sectionId);
    } else {
      newSections.add(sectionId);
    }
    setVisibleSections(newSections);
  };

  const saveSectionPreference = async (sections: Set<string>) => {
    if (!campaignId) return;
    try {
      await fetch(`/api/campaigns/${campaignId}/preference`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleSections: Array.from(sections) }),
      });
    } catch (error) {
      console.error("Error saving section preference:", error);
    }
  };

  useEffect(() => {
    params.then((p) => setCampaignId(p.campaignId));
  }, [params]);

  useEffect(() => {
    if (!campaignId) return;

    const fetchCampaign = async () => {
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
    };

    const fetchPreference = async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/preference`);
        if (response.ok) {
          const data = await response.json();
          setSelectedLevel(data.selectedLevel || 1);
          if (data.visibleSections && Array.isArray(data.visibleSections)) {
            setVisibleSections(new Set(data.visibleSections));
          }
        }
      } catch (error) {
        console.error("Error fetching preference:", error);
      }
    };

    fetchCampaign();
    fetchPreference();
  }, [campaignId]);

  useEffect(() => {
    saveSectionPreference(visibleSections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSections, campaignId]);

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
          <p className="mb-4">Loading campaign...</p>
          <Spinner className="w-8 h-8 mx-auto" />
        </Card>
      </div>
    );
  }

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <Spinner className="w-8 h-8 mx-auto" />
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
        </div>

        {/* Level Selector and Section Filter */}
        <Card className="p-6 overflow-visible">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="shrink-0">
                <h2 className="font-semibold text-base">Select Character Level</h2>
                <p className="text-sm text-muted-foreground">
                  View party members at a specific level
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="bg-muted hover:bg-muted/80 border border-border text-foreground hover:text-foreground whitespace-nowrap px-4 py-2 rounded-md text-sm transition-colors cursor-pointer w-full sm:w-45 font-medium">
                  Level {selectedLevel}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Select Character Level</DropdownMenuLabel>
                    {levelArray.map((level) => (
                      <DropdownMenuCheckboxItem
                        key={level}
                        checked={selectedLevel === level}
                        onCheckedChange={() => handleLevelChange(level)}
                        className="text-sm"
                      >
                        Level {level}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Section Visibility Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 shrink-0">
              <div className="shrink-0">
                <h3 className="font-semibold text-base">Display Sections</h3>
                <p className="text-sm text-muted-foreground">Customize card content visibility</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="bg-muted hover:bg-muted/80 border border-border text-foreground hover:text-foreground whitespace-nowrap px-4 py-2 rounded-md text-sm transition-colors cursor-pointer w-full sm:w-45 font-medium">
                  {visibleSections.size} section{visibleSections.size !== 1 ? "s" : ""} selected
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Customize Character Cards</DropdownMenuLabel>
                    {availableSections.map((section) => (
                      <DropdownMenuCheckboxItem
                        key={section.id}
                        checked={visibleSections.has(section.id)}
                        onCheckedChange={() => toggleSection(section.id)}
                        className="text-sm"
                      >
                        {section.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 auto-rows-max"
                  style={{ gridAutoRows: "1fr" }}
                >
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
                          className="p-6 bg-linear-to-br from-amber-950 via-slate-900 to-slate-800 border-amber-700/50 text-white hover:border-amber-700 transition-colors flex flex-col h-full"
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
                            <div className="space-y-3 flex-1">
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
                              {visibleSections.has("abilityScores") &&
                              typeof extracted.abilityScores === "object" &&
                              extracted.abilityScores !== null &&
                              Object.keys(extracted.abilityScores).length > 0 ? (
                                <div className="bg-slate-700/40 rounded p-3 border border-slate-600/50">
                                  <div className="text-xs font-semibold text-amber-200 mb-2">
                                    ABILITY SCORES
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    {Object.entries(
                                      extracted.abilityScores as Record<string, unknown>,
                                    ).map(([ability, score]) => {
                                      const abbr =
                                        {
                                          strength: "STR",
                                          dexterity: "DEX",
                                          constitution: "CON",
                                          intelligence: "INT",
                                          wisdom: "WIS",
                                          charisma: "CHA",
                                        }[ability] || ability.toUpperCase().substring(0, 3);

                                      return score ? (
                                        <div key={ability} className="text-center">
                                          <div className="text-slate-300">{abbr}</div>
                                          <div className="font-bold text-amber-100">
                                            {toNum(score)}
                                          </div>
                                          <div className="text-slate-400">
                                            {getMod(score) >= 0 ? "+" : ""}
                                            {getMod(score)}
                                          </div>
                                        </div>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              ) : null}

                              {/* Resistances/Immunities */}
                              {visibleSections.has("resistances") &&
                              (extracted.damageResistances || extracted.damageImmunities) ? (
                                <div className="bg-slate-700/40 rounded p-3 border border-slate-600/50 text-xs space-y-1">
                                  {extracted.damageResistances ? (
                                    <div>
                                      <span className="text-amber-200 font-semibold">
                                        Resistances:
                                      </span>
                                      <div className="text-slate-300">
                                        {String(extracted.damageResistances)}
                                      </div>
                                    </div>
                                  ) : null}
                                  {extracted.damageImmunities ? (
                                    <div>
                                      <span className="text-amber-200 font-semibold">
                                        Immunities:
                                      </span>
                                      <div className="text-slate-300">
                                        {String(extracted.damageImmunities)}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {/* Senses and Special Abilities */}
                              {visibleSections.has("senses") &&
                              (extracted.senses ||
                                extracted.languages ||
                                extracted.specialAbilities ||
                                extracted.damageResistances) ? (
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
                          {/* View and Download Buttons */}
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-amber-700/50 text-amber-100 hover:bg-amber-700/20"
                              onClick={() => {
                                setSelectedCharacterId(member.characterId);
                                setSelectedCharacterName(member.character?.name || "Character");
                                setViewerOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Full Character Sheet
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-700/50 text-amber-100 hover:bg-amber-700/20 px-3"
                              onClick={() => {
                                window.open(
                                  `/api/characters/${member.characterId}/levels/${selectedLevel}/pdf`,
                                  "_blank",
                                );
                              }}
                              title="Download character sheet PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
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
