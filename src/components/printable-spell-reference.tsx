"use client";

import React from "react";
import { parseSpellDescription } from "@/lib/spell-description-parser";
import { type Spell } from "@/lib/spells-server";

interface PrintableSpellReferenceProps {
  spell: Spell;
  format: "monochrome" | "styled";
  fontSize: "xsmall" | "small" | "medium" | "large";
  index?: number;
}

export function PrintableSpellReference({
  spell,
  format,
  fontSize,
  index,
}: PrintableSpellReferenceProps) {
  const levelDisplay = spell.level === 0 ? "Cantrip" : `Level ${spell.level}`;

  // Font size and spacing adjustments for print
  const fontConfig = {
    xsmall: { base: "8pt", title: "10pt", label: "6pt", lineHeight: "1.1", spacing: "1mm" },
    small: { base: "9pt", title: "11pt", label: "7pt", lineHeight: "1.2", spacing: "1.5mm" },
    medium: { base: "10pt", title: "12pt", label: "8pt", lineHeight: "1.3", spacing: "2mm" },
    large: { base: "11pt", title: "13pt", label: "9pt", lineHeight: "1.4", spacing: "2.5mm" },
  };

  const config = fontConfig[fontSize];

  // Color configuration for screen and print modes
  // For styled format, use amber/brown colors; for monochrome, inherit from parent
  const colors = {
    border: format === "styled" ? "#92400e" : "currentColor",
    primary: format === "styled" ? "#78350f" : "currentColor",
    secondary: format === "styled" ? "#a16207" : "currentColor",
    text: "inherit",
  };

  return (
    <div
      className="break-inside-avoid"
      data-print-index={index}
      style={{
        marginBottom: config.spacing,
        fontFamily: '"Segoe UI", Arial, sans-serif',
        fontSize: config.base,
        lineHeight: config.lineHeight,
        breakInside: "avoid",
        pageBreakInside: "avoid",
        color: colors.text,
      }}
    >
      {/* Header: Spell Name | Level • School */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "1mm",
          paddingBottom: "1mm",
          borderBottom: `2px solid ${colors.border}`,
        }}
      >
        <span
          style={{
            fontWeight: "bold",
            fontSize: config.title,
            color: colors.primary,
          }}
        >
          {spell.name}
        </span>
        <span
          style={{
            fontSize: config.label,
            color: colors.secondary,
            fontWeight: "500",
          }}
        >
          {levelDisplay} • {spell.school}
          {spell.ritual && " • Ritual"}
        </span>
      </div>

      {/* Quick reference line: Range | Time | Conc. | Duration */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "2mm",
          fontSize: config.label,
          marginBottom: "1.5mm",
          padding: "1mm 0",
          color: colors.primary,
        }}
      >
        <div>
          <div style={{ fontWeight: "bold" }}>Range</div>
          <div>{spell.range}</div>
        </div>
        <div>
          <div style={{ fontWeight: "bold" }}>Casting</div>
          <div>{spell.casting_time}</div>
        </div>
        <div>
          <div style={{ fontWeight: "bold" }}>Conc.</div>
          <div>{spell.concentration ? "Yes" : "No"}</div>
        </div>
        <div>
          <div style={{ fontWeight: "bold" }}>Duration</div>
          <div>{spell.duration}</div>
        </div>
      </div>

      {/* Components */}
      <div style={{ marginBottom: "1mm", fontSize: config.base }}>
        <span style={{ fontWeight: "bold", color: colors.primary }}>Components:</span>{" "}
        {spell.components.join(", ")}
        {spell.material && (
          <>
            <div style={{ marginTop: "0.5mm", fontSize: config.label }}>
              <span style={{ fontWeight: "bold", color: colors.primary }}>M:</span> {spell.material}
            </div>
          </>
        )}
      </div>

      {/* Classes */}
      {spell.class.length > 0 && (
        <div style={{ marginBottom: "1mm", fontSize: config.label }}>
          <span style={{ fontWeight: "bold", color: colors.primary }}>Classes:</span>{" "}
          {spell.class.join(", ")}
        </div>
      )}

      {/* Description */}
      <div
        style={{
          marginTop: "1mm",
          color: "inherit",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflow: "hidden",
          display: "block",
        }}
      >
        {parseSpellDescription(spell.desc)}
      </div>

      {/* Higher Level */}
      {spell.higher_level && (
        <div style={{ marginTop: "1mm", paddingTop: "0.5mm" }}>
          <span style={{ fontWeight: "bold", color: colors.primary }}>At Higher Levels:</span>{" "}
          <span style={{ color: colors.text }}>{parseSpellDescription(spell.higher_level)}</span>
        </div>
      )}
    </div>
  );
}
