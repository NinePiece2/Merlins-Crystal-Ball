"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type Spell } from "@/lib/spells-server";

interface SpellFilterProps {
  spells: Spell[];
  classes: string[];
  selectedClasses: Set<string>;
  selectedSpells: Set<string>;
  searchQuery: string;
  onClassToggle: (className: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSpellToggle: (spellId: string) => void;
  onSearchQueryChange: (query: string) => void;
}

export function SpellFilter({
  spells,
  classes,
  selectedClasses,
  selectedSpells,
  searchQuery,
  onClassToggle,
  onSelectAll,
  onClearAll,
  onSpellToggle,
  onSearchQueryChange,
}: SpellFilterProps) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSpells = spells.filter((spell) => {
    const matchesClass =
      selectedClasses.size === 0 || spell.class.some((cls) => selectedClasses.has(cls));

    if (!matchesClass) return false;
    if (!normalizedQuery) return true;

    const searchableText = `${spell.name} ${spell.id} ${spell.school} ${spell.level}`.toLowerCase();
    return searchableText.includes(normalizedQuery);
  });

  const selectAllClasses = selectedClasses.size === classes.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Class Filter Sidebar */}
      <div className="lg:col-span-1">
        <Card className="bg-background border-border sticky top-4">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Filter by Class</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={selectAllClasses ? "default" : "outline"}
                size="sm"
                onClick={onSelectAll}
                className="flex-1"
              >
                All
              </Button>
              <Button variant={"outline"} size="sm" onClick={onClearAll} className="flex-1">
                None
              </Button>
            </div>

            <Separator className="bg-border/50" />

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {classes.map((className) => {
                const isSelected = selectedClasses.has(className);
                const classSpellCount = spells.filter((s) => s.class.includes(className)).length;

                return (
                  <div key={className} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${className}`}
                      checked={isSelected}
                      onCheckedChange={() => onClassToggle(className)}
                    />
                    <label
                      htmlFor={`class-${className}`}
                      className="text-sm text-foreground cursor-pointer flex-1"
                    >
                      {className}
                      <span className="text-muted-foreground text-xs ml-1">
                        ({classSpellCount})
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spell Selection */}
      <div className="lg:col-span-3">
        <Card className="bg-background border-border">
          <CardHeader>
            <div className="space-y-3">
              <Input
                placeholder="Search spells by name, id, school, or level"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="bg-muted border-border text-foreground"
              />

              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground text-lg">
                  Select Spells ({selectedSpells.size} of {filteredSpells.length})
                </CardTitle>
                <Badge className="bg-primary text-primary-foreground">
                  {filteredSpells.length}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredSpells.map((spell) => {
                const isSelected = selectedSpells.has(spell.id);
                return (
                  <div
                    key={spell.id}
                    className="flex items-center space-x-2 p-2 rounded border border-border hover:border-primary/60 transition-colors"
                  >
                    <Checkbox
                      id={`spell-${spell.id}`}
                      checked={isSelected}
                      onCheckedChange={() => onSpellToggle(spell.id)}
                    />
                    <label
                      htmlFor={`spell-${spell.id}`}
                      className="text-sm text-foreground cursor-pointer flex-1 truncate"
                      title={spell.name}
                    >
                      {spell.name}
                    </label>
                  </div>
                );
              })}
            </div>

            {filteredSpells.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No spells found for the selected classes and search query
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
