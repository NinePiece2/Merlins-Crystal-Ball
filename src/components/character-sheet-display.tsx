"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpellHoverCard } from "@/components/spell-hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

export interface CharacterSheetData {
  characterName?: string;
  playerName?: string;
  profileImage?: string;
  race?: string;
  background?: string;
  alignment?: string;
  classLevel?: string;
  maxHP?: string | number;
  currentHP?: string | number;
  temporaryHP?: string | number;
  ac?: string | number;
  initiative?: string | number;
  speed?: string | number;
  proficiencyBonus?: string | number;
  experiencePoints?: string | number;
  passivePerception?: string | number;
  hitDice?: string | number;
  abilityScores?: Record<string, unknown>;
  savingThrows?: Record<string, unknown>;
  skills?: Record<string, unknown>;
  damageResistances?: string[];
  damageImmunities?: string[];
  damageVulnerabilities?: string[];
  conditionImmunities?: string[];
  senses?: Record<string, unknown>;
  languages?: string[];
  equipment?: string[];
  classFeatures?: string[];
  spells?: string[];
  cantrips?: string[];
  weaponProficiencies?: string[];
  armorProficiencies?: string[];
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  backstory?: string;
  additionalNotesField?: string;
  features?: string;
  additionalFeatures?: string;
  alliesOrganizations?: string;
  defenses?: string;
}

interface CharacterSheetDisplayProps {
  data: CharacterSheetData;
  isLoading?: boolean;
  characterId?: string;
  level?: number;
  onDownload?: (characterId: string, level: number) => void;
}

const abilityAbbreviations: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const skillAbilityMap: Record<string, string> = {
  Acrobatics: "DEX",
  AnimalHandling: "WIS",
  Animal: "WIS",
  Arcana: "INT",
  Athletics: "STR",
  Deception: "CHA",
  History: "INT",
  Insight: "WIS",
  Intimidation: "CHA",
  Investigation: "INT",
  Medicine: "WIS",
  Nature: "INT",
  Perception: "WIS",
  Performance: "CHA",
  Persuasion: "CHA",
  Religion: "INT",
  SleightofHand: "DEX",
  Stealth: "DEX",
  Survival: "WIS",
};

export function CharacterSheetDisplay({
  data,
  isLoading = false,
  characterId,
  level,
  onDownload,
}: CharacterSheetDisplayProps) {
  const characterInitials = useMemo(() => {
    if (!data.characterName) return "?";
    return data.characterName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [data.characterName]);

  const hpPercentage = useMemo(() => {
    const max = Number(data.maxHP) || 0;
    const current = Number(data.currentHP) || 0;
    return max > 0 ? (current / max) * 100 : 0;
  }, [data.maxHP, data.currentHP]);

  if (isLoading) {
    return (
      <Card className="w-full bg-gradient-to-b from-stone-900 to-stone-950 border-amber-800">
        <CardContent className="p-8">
          <div className="text-center text-amber-700">Loading character...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full space-y-4 bg-stone-950">
        {/* Character Header */}
        <Card className="bg-gradient-to-r from-amber-900/30 to-red-900/30 border-amber-700 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <Avatar className="h-16 w-16 border-2 border-amber-700 bg-amber-900">
                  {data.profileImage && (
                    <AvatarImage src={data.profileImage} alt={data.characterName || "Character"} />
                  )}
                  <AvatarFallback className="bg-amber-800 text-amber-100 font-bold text-lg">
                    {characterInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold text-amber-100">
                    {data.characterName || "Unknown Character"}
                  </CardTitle>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.classLevel && (
                      <HoverCard>
                        <HoverCardTrigger>
                          <Badge className="bg-red-800/60 text-red-100 hover:bg-red-700 cursor-help">
                            {data.classLevel}
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72 bg-stone-800 border-amber-700">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-amber-100">Class Details</p>
                            <Separator className="bg-amber-700/50" />
                            {data.experiencePoints && (
                              <p className="text-xs text-amber-100">
                                XP: <span className="font-semibold">{data.experiencePoints}</span>
                              </p>
                            )}
                            {data.proficiencyBonus && (
                              <p className="text-xs text-amber-100">
                                Prof. Bonus:{" "}
                                <span className="font-semibold">{data.proficiencyBonus}</span>
                              </p>
                            )}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}

                    {data.race && (
                      <Badge className="bg-purple-800/60 text-purple-100">{data.race}</Badge>
                    )}

                    {data.background && (
                      <Badge className="bg-blue-800/60 text-blue-100">{data.background}</Badge>
                    )}

                    {data.alignment && (
                      <Badge className="bg-gray-700/60 text-gray-100">{data.alignment}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* HP Display */}
              <div className="text-right">
                <div className="mb-2">
                  <div className="text-xs text-amber-300/70 uppercase tracking-wide font-semibold">
                    Hit Points
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-3xl font-bold text-red-300 cursor-help">
                        {data.currentHP || 0}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <div className="text-sm">
                        <p>
                          Current HP: {data.currentHP || 0} / {data.maxHP || 0}
                        </p>
                        {data.temporaryHP && <p>Temporary: +{data.temporaryHP}</p>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-xs text-amber-300/70">of {data.maxHP || 0}</div>
                </div>

                {/* HP Bar */}
                <div className="w-32 h-2 bg-stone-800 rounded border border-red-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all"
                    style={{ width: `${hpPercentage}%` }}
                  />
                </div>

                {/* Download Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (characterId && level && onDownload) {
                      onDownload(characterId, level);
                    }
                  }}
                  disabled={!characterId || !level || !onDownload}
                  className="mt-3 w-full text-amber-100 hover:text-amber-200 hover:bg-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    !characterId || !level || !onDownload
                      ? "Character data not available"
                      : "Download character sheet"
                  }
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Full Sheet
                </Button>
              </div>
            </div>

            {data.playerName && (
              <CardDescription className="text-amber-200/70 mt-3">
                Played by {data.playerName}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        {/* Combat Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.ac && (
            <Card className="bg-stone-800/50 border-amber-700/50 h-full">
              <CardContent className="p-3 h-full flex flex-col justify-center">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center cursor-help">
                      <div className="text-[10px] sm:text-xs text-amber-400/70 uppercase tracking-wider font-semibold leading-tight">
                        AC
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-amber-100 leading-tight">
                        {data.ac}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Armor Class</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          )}

          {data.initiative !== undefined && (
            <Card className="bg-stone-800/50 border-amber-700/50 h-full">
              <CardContent className="p-3 h-full flex flex-col justify-center">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center cursor-help">
                      <div className="text-[10px] sm:text-xs text-amber-400/70 uppercase tracking-wider font-semibold leading-tight">
                        Init
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-amber-100 leading-tight">
                        {data.initiative}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Initiative Modifier</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          )}

          {data.speed && (
            <Card className="bg-stone-800/50 border-amber-700/50 h-full">
              <CardContent className="p-3 h-full flex flex-col justify-center">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center cursor-help">
                      <div className="text-[10px] sm:text-xs text-amber-400/70 uppercase tracking-wider font-semibold leading-tight">
                        Spd
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-amber-100 leading-tight">
                        {data.speed}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Movement Speed</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          )}

          {data.passivePerception && (
            <Card className="bg-stone-800/50 border-amber-700/50 h-full">
              <CardContent className="p-3 h-full flex flex-col justify-center">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center cursor-help">
                      <div className="text-[10px] sm:text-xs text-amber-400/70 uppercase tracking-wider font-semibold leading-tight">
                        PP
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-amber-100 leading-tight">
                        {data.passivePerception}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Passive Perception</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Ability Scores and Skills Tabs */}
        <Tabs defaultValue="abilities" className="w-full">
          <TabsList className="bg-stone-800/50 border-b border-amber-700/50">
            <TabsTrigger value="abilities" className="text-amber-100">
              Abilities
            </TabsTrigger>
            <TabsTrigger value="skills" className="text-amber-100">
              Skills
            </TabsTrigger>
            <TabsTrigger value="resistances" className="text-amber-100">
              Defenses
            </TabsTrigger>
            {data.spells && data.spells.length > 0 && (
              <TabsTrigger value="spells" className="text-amber-100">
                Spells
              </TabsTrigger>
            )}
            <TabsTrigger value="background" className="text-amber-100">
              Background
            </TabsTrigger>
          </TabsList>

          {/* Abilities Tab */}
          <TabsContent value="abilities" className="space-y-4 min-h-96">
            {data.abilityScores && Object.keys(data.abilityScores).length > 0 && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Ability Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(data.abilityScores || {}).map(([ability, score]) => {
                      const scoreValue = String(score);
                      return (
                        <HoverCard key={ability}>
                          <HoverCardTrigger>
                            <div className="bg-stone-900/50 border border-amber-700/30 rounded-lg p-3 cursor-help hover:border-amber-600 transition-colors">
                              <div className="text-xs text-amber-400/70 uppercase tracking-wider font-semibold">
                                {abilityAbbreviations[ability] || ability}
                              </div>
                              <div className="text-2xl font-bold text-amber-100">{scoreValue}</div>
                              <div className="text-xs text-amber-300/60 mt-1">
                                {ability.charAt(0).toUpperCase() + ability.slice(1)}
                              </div>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-48 bg-stone-800 border-amber-700">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-amber-100">
                                {ability.charAt(0).toUpperCase() + ability.slice(1)}
                              </p>
                              <p className="text-xs text-amber-100/70">
                                Score: <span className="font-semibold">{scoreValue}</span>
                              </p>
                              <p className="text-xs text-amber-100/70">
                                Modifier:{" "}
                                <span className="font-semibold">
                                  {Math.floor((Number(score) - 10) / 2) > 0 ? "+" : ""}
                                  {Math.floor((Number(score) - 10) / 2)}
                                </span>
                              </p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.savingThrows && Object.keys(data.savingThrows).length > 0 && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Saving Throws</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table className="text-amber-100">
                    <TableBody>
                      {Object.entries(data.savingThrows).map(([ability, bonus]) => (
                        <TableRow
                          key={ability}
                          className="border-amber-700/30 hover:bg-amber-900/20"
                        >
                          <TableCell className="font-semibold">
                            {abilityAbbreviations[ability] || ability}
                          </TableCell>
                          <TableCell className="text-right font-bold">{String(bonus)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-4 min-h-96">
            {data.skills && Object.keys(data.skills).length > 0 && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table className="text-amber-100">
                    <TableHeader>
                      <TableRow className="border-amber-700/30">
                        <TableHead className="text-amber-100">Skill</TableHead>
                        <TableHead className="text-amber-100 text-center">Ability</TableHead>
                        <TableHead className="text-amber-100 text-right">Bonus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(data.skills)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([skill, bonus]) => (
                          <TableRow
                            key={skill}
                            className="border-amber-700/30 hover:bg-amber-900/20"
                          >
                            <TableCell className="font-semibold">{skill}</TableCell>
                            <TableCell className="text-center text-sm">
                              {skillAbilityMap[skill] || "—"}
                            </TableCell>
                            <TableCell className="text-right font-bold">{String(bonus)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {data.languages && data.languages.length > 0 && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Languages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.languages.map((lang) => (
                      <Badge key={lang} className="bg-blue-900/60 text-blue-100">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.weaponProficiencies && data.weaponProficiencies.length > 0 && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Weapon Proficiencies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.weaponProficiencies.map((weapon) => (
                      <Badge key={weapon} className="bg-red-900/60 text-red-100">
                        {weapon}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.armorProficiencies && data.armorProficiencies.length > 0 && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Armor Proficiencies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.armorProficiencies.map((armor) => (
                      <Badge key={armor} className="bg-amber-900/60 text-amber-100">
                        {armor}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Resistances Tab */}
          <TabsContent value="resistances" className="space-y-4 min-h-96">
            {(data.damageResistances?.length ||
              data.damageImmunities?.length ||
              data.damageVulnerabilities?.length ||
              data.conditionImmunities?.length) && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Damage & Condition</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.damageResistances && data.damageResistances.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300 mb-2">Resistances</h4>
                      <div className="flex flex-wrap gap-2">
                        {data.damageResistances.map((resist) => (
                          <Badge key={resist} className="bg-green-900/60 text-green-100">
                            {resist}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.damageImmunities && data.damageImmunities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300 mb-2">Immunities</h4>
                      <div className="flex flex-wrap gap-2">
                        {data.damageImmunities.map((immunity) => (
                          <Badge key={immunity} className="bg-yellow-900/60 text-yellow-100">
                            {immunity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.damageVulnerabilities && data.damageVulnerabilities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300 mb-2">Vulnerabilities</h4>
                      <div className="flex flex-wrap gap-2">
                        {data.damageVulnerabilities.map((vuln) => (
                          <Badge key={vuln} className="bg-red-900/60 text-red-100">
                            {vuln}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.conditionImmunities && data.conditionImmunities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300 mb-2">
                        Condition Immunities
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {data.conditionImmunities.map((condition) => (
                          <Badge key={condition} className="bg-purple-900/60 text-purple-100">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {data.senses && Object.keys(data.senses).length > 0 && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Senses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(data.senses).map(([sense, value]) => (
                    <div key={sense} className="flex justify-between items-center">
                      <span className="text-amber-100/70 capitalize">{sense}</span>
                      <span className="text-amber-100 font-semibold">{String(value)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {data.equipment && data.equipment.length > 0 && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Equipment</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.equipment.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-amber-100">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Spells Tab */}
          {data.spells && data.spells.length > 0 && (
            <TabsContent value="spells" className="space-y-4 min-h-96">
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Spells</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.spells.map((spell, idx) => (
                      <SpellHoverCard key={idx} spellName={spell}>
                        <Badge className="bg-purple-900/60 text-purple-100 cursor-help">
                          {spell}
                        </Badge>
                      </SpellHoverCard>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Background Tab */}
          <TabsContent value="background" className="space-y-4 min-h-96">
            {(data.personalityTraits || data.ideals || data.bonds || data.flaws) && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Personality & Traits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.personalityTraits && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300 mb-2">
                        Personality Traits
                      </h4>
                      <p className="text-amber-100/80 text-sm">{data.personalityTraits}</p>
                    </div>
                  )}

                  {data.ideals && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300 mb-2">Ideals</h4>
                      <p className="text-amber-100/80 text-sm">{data.ideals}</p>
                    </div>
                  )}

                  {data.bonds && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300 mb-2">Bonds</h4>
                      <p className="text-amber-100/80 text-sm">{data.bonds}</p>
                    </div>
                  )}

                  {data.flaws && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300 mb-2">Flaws</h4>
                      <p className="text-amber-100/80 text-sm">{data.flaws}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {data.backstory && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Backstory</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-amber-100/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {data.backstory}
                  </p>
                </CardContent>
              </Card>
            )}

            {data.classFeatures && data.classFeatures.length > 0 && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Class Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-amber-100/80 text-sm whitespace-pre-wrap">
                    {data.classFeatures.map((feature, idx) => (
                      <p key={idx}>{feature}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.additionalNotesField && (
              <Card className="bg-stone-800/50 border-amber-700/50">
                <CardHeader>
                  <CardTitle className="text-amber-100">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-amber-100/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {data.additionalNotesField}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
