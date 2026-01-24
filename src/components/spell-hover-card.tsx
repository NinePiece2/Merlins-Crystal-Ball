"use client";

import React, { useState, useEffect } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { searchSpell, type Spell } from "@/lib/spells-server";
import { parseSpellDescription } from "@/lib/spell-description-parser";

interface SpellHoverCardProps {
  spellName: string;
  children?: React.ReactNode;
}

export function SpellHoverCard({ spellName, children }: SpellHoverCardProps) {
  const [spell, setSpell] = useState<Spell | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSpell = async () => {
      try {
        setLoading(true);
        setError(null);
        const foundSpell = await searchSpell(spellName);
        setSpell(foundSpell);
        if (!foundSpell) {
          console.warn(`[SpellHoverCard] Spell not found in database: "${spellName}"`);
          setError("Spell not found");
        }
      } catch (err) {
        setError("Failed to load spell details");
        console.error("[SpellHoverCard] Error loading spell:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSpell();
  }, [spellName]);

  if (!spell) {
    return children ? <>{children}</> : <span>{spellName}</span>;
  }

  const levelDisplay = spell.level === 0 ? "Cantrip" : `Level ${spell.level}`;

  return (
    <HoverCard>
      <HoverCardTrigger>
        {children ? (
          <div className="cursor-help">{children}</div>
        ) : (
          <div className="cursor-help">{spellName}</div>
        )}
      </HoverCardTrigger>
      <HoverCardContent className="w-96 bg-stone-800 border-amber-700">
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-bold text-amber-100">{spell.name}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className="bg-purple-900/60 text-purple-100">{levelDisplay}</Badge>
              <Badge className="bg-blue-900/60 text-blue-100">{spell.school}</Badge>
              {spell.ritual && <Badge className="bg-green-900/60 text-green-100">Ritual</Badge>}
            </div>
          </div>

          <Separator className="bg-amber-700/50" />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-amber-400/70 text-xs font-semibold uppercase">Range</p>
              <p className="text-amber-100">{spell.range}</p>
            </div>
            <div>
              <p className="text-amber-400/70 text-xs font-semibold uppercase">Duration</p>
              <p className="text-amber-100">{spell.duration}</p>
            </div>
            <div>
              <p className="text-amber-400/70 text-xs font-semibold uppercase">Casting Time</p>
              <p className="text-amber-100">{spell.casting_time}</p>
            </div>
            <div>
              <p className="text-amber-400/70 text-xs font-semibold uppercase">Concentration</p>
              <p className="text-amber-100">{spell.concentration ? "Yes" : "No"}</p>
            </div>
          </div>

          <div>
            <p className="text-amber-400/70 text-xs font-semibold uppercase mb-1">Components</p>
            <div className="flex gap-1">
              {spell.components.map((comp) => (
                <Badge key={comp} className="bg-amber-900/60 text-amber-100 text-xs">
                  {comp}
                </Badge>
              ))}
            </div>
            {spell.material && (
              <p className="text-amber-100/70 text-xs mt-1">
                <span className="font-semibold">Material:</span> {spell.material}
              </p>
            )}
          </div>

          <div>
            <p className="text-amber-400/70 text-xs font-semibold uppercase mb-1">Classes</p>
            <div className="flex flex-wrap gap-1">
              {spell.class.map((cls) => (
                <Badge key={cls} className="bg-indigo-900/60 text-indigo-100 text-xs">
                  {cls}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-amber-700/50" />

          <div>
            <p className="text-amber-400/70 text-xs font-semibold uppercase mb-1">Description</p>
            <div className="text-amber-100/80 text-xs leading-relaxed whitespace-pre-wrap">
              {parseSpellDescription(spell.desc)}
            </div>
          </div>

          {spell.higher_level && (
            <div>
              <p className="text-amber-400/70 text-xs font-semibold uppercase mb-1">
                At Higher Levels
              </p>
              <div className="text-amber-100/80 text-xs leading-relaxed whitespace-pre-wrap">
                {parseSpellDescription(spell.higher_level)}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
