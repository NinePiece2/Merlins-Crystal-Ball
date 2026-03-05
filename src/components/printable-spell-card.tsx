"use client";

import React from "react";
import { parseSpellDescription } from "@/lib/spell-description-parser";
import { type Spell } from "@/lib/spells-server";

interface PrintableSpellCardProps {
  spell: Spell;
  format: "monochrome" | "styled";
  fontSize: "small" | "medium" | "large";
  index?: number;
}

const fontSizeClasses = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
};

const containerSizeClasses = {
  small: "p-1 gap-0.5",
  medium: "p-1.5 gap-1",
  large: "p-2 gap-1.5",
};

const headingSizeClasses = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

export function PrintableSpellCard({ spell, format, fontSize, index }: PrintableSpellCardProps) {
  if (format === "monochrome") {
    return (
      <div
        className={`border border-gray-400 bg-white text-gray-900 break-inside-avoid ${containerSizeClasses[fontSize]} space-y-1`}
        data-print-index={index}
      >
        {/* Header */}
        <div>
          <h3 className={`font-bold ${headingSizeClasses[fontSize]} leading-tight`}>
            {spell.name}
          </h3>
          <div className={`${fontSizeClasses[fontSize]} text-gray-700 mt-0.5 font-semibold`}>
            {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
            {" • "}
            {spell.school}
            {spell.ritual && " • Ritual"}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className={`grid grid-cols-4 gap-1 text-xs border-t border-gray-300 pt-1`}>
          <div>
            <p className="font-bold text-gray-700">Range</p>
            <p className="text-gray-800 leading-tight">{spell.range}</p>
          </div>
          <div>
            <p className="font-bold text-gray-700">Time</p>
            <p className="text-gray-800 leading-tight">{spell.casting_time}</p>
          </div>
          <div>
            <p className="font-bold text-gray-700">Conc.</p>
            <p className="text-gray-800 leading-tight">{spell.concentration ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="font-bold text-gray-700">Duration</p>
            <p className="text-gray-800 leading-tight">{spell.duration}</p>
          </div>
        </div>

        {/* Components */}
        <div className="text-xs border-t border-gray-300 pt-1">
          <p className="font-bold text-gray-700">Components: {spell.components.join(", ")}</p>
          {spell.material && (
            <p className="text-gray-700 mt-0.5">
              <span className="font-bold">Material:</span> {spell.material}
            </p>
          )}
        </div>

        {/* Classes */}
        {spell.class.length > 0 && (
          <p className="text-xs font-bold text-gray-700 border-t border-gray-300 pt-1">
            Classes: {spell.class.join(", ")}
          </p>
        )}

        {/* Description */}
        <div className="text-xs border-t border-gray-300 pt-1">
          <p className="font-bold text-gray-700 mb-0.5">Effect</p>
          <div
            className={`${fontSizeClasses[fontSize]} text-gray-800 leading-snug whitespace-pre-wrap`}
          >
            {parseSpellDescription(spell.desc)}
          </div>
        </div>

        {/* Higher Level */}
        {spell.higher_level && (
          <div className="text-xs">
            <p className="font-bold text-gray-700 mb-0.5">At Higher Levels</p>
            <div
              className={`${fontSizeClasses[fontSize]} text-gray-800 leading-snug whitespace-pre-wrap`}
            >
              {parseSpellDescription(spell.higher_level)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Styled format - Print-optimized
  return (
    <div
      className={`border-2 border-amber-800 bg-amber-50 text-amber-900 break-inside-avoid ${containerSizeClasses[fontSize]} space-y-1`}
      data-print-index={index}
    >
      {/* Header */}
      <div>
        <h3 className={`font-bold text-amber-950 ${headingSizeClasses[fontSize]} leading-tight`}>
          {spell.name}
        </h3>
        <div className={`${fontSizeClasses[fontSize]} text-amber-800 mt-0.5 font-semibold`}>
          {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
          {" • "}
          {spell.school}
          {spell.ritual && " • Ritual"}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className={`grid grid-cols-4 gap-1 text-xs border-t-2 border-amber-600 pt-1`}>
        <div>
          <p className="font-bold text-amber-900">Range</p>
          <p className="text-amber-900 leading-tight">{spell.range}</p>
        </div>
        <div>
          <p className="font-bold text-amber-900">Time</p>
          <p className="text-amber-900 leading-tight">{spell.casting_time}</p>
        </div>
        <div>
          <p className="font-bold text-amber-900">Conc.</p>
          <p className="text-amber-900 leading-tight">{spell.concentration ? "Yes" : "No"}</p>
        </div>
        <div>
          <p className="font-bold text-amber-900">Duration</p>
          <p className="text-amber-900 leading-tight">{spell.duration}</p>
        </div>
      </div>

      {/* Components */}
      <div className="text-xs border-t-2 border-amber-600 pt-1">
        <p className="font-bold text-amber-900">Components: {spell.components.join(", ")}</p>
        {spell.material && (
          <p className="text-amber-900 mt-0.5">
            <span className="font-bold">Material:</span> {spell.material}
          </p>
        )}
      </div>

      {/* Classes */}
      {spell.class.length > 0 && (
        <p className="text-xs font-bold text-amber-900 border-t-2 border-amber-600 pt-1">
          Classes: {spell.class.join(", ")}
        </p>
      )}

      {/* Description */}
      <div className="text-xs border-t-2 border-amber-600 pt-1">
        <p className="font-bold text-amber-900 mb-0.5">Effect</p>
        <div
          className={`${fontSizeClasses[fontSize]} text-amber-950 leading-snug whitespace-pre-wrap`}
        >
          {parseSpellDescription(spell.desc)}
        </div>
      </div>

      {/* Higher Level */}
      {spell.higher_level && (
        <div className="text-xs">
          <p className="font-bold text-amber-900 mb-0.5">At Higher Levels</p>
          <div
            className={`${fontSizeClasses[fontSize]} text-amber-950 leading-snug whitespace-pre-wrap`}
          >
            {parseSpellDescription(spell.higher_level)}
          </div>
        </div>
      )}
    </div>
  );
}
