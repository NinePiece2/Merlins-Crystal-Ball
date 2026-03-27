"use client";

import React from "react";
import { parseSpellDescription } from "@/lib/spell-description-parser";
import { type Spell } from "@/lib/spells-server";

interface PrintableSpellReferenceProps {
  spell: Spell;
  format: "monochrome" | "styled" | "professional";
  fontSize: "xsmall" | "small" | "medium" | "large";
  cardHeightPreset: "compact" | "standard" | "generous" | "variable";
  showClasses: boolean;
  showHigherLevels: boolean;
  showMaterial: boolean;
  inkSaver: boolean;
  index?: number;
}

export function PrintableSpellReference({
  spell,
  format,
  fontSize,
  cardHeightPreset,
  showClasses,
  showHigherLevels,
  showMaterial,
  inkSaver,
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
  const cardHeight = {
    compact: "8cm",
    standard: "12cm",
    generous: "15cm",
    variable: "auto",
  }[cardHeightPreset];
  const hasFixedHeight = cardHeightPreset !== "variable";

  // Color configuration for screen and print modes
  // Keep the same two modes, but add clearer hierarchy and section contrast for print.
  const colors = {
    border: format === "styled" ? "#92400e" : format === "professional" ? "#334155" : "#4b5563",
    primary: format === "styled" ? "#78350f" : format === "professional" ? "#0f172a" : "#111827",
    secondary: format === "styled" ? "#a16207" : format === "professional" ? "#1e3a8a" : "#4b5563",
    label: format === "styled" ? "#92400e" : format === "professional" ? "#334155" : "#6b7280",
    chipBg: format === "styled" ? "#fef3c7" : format === "professional" ? "#dbeafe" : "#f3f4f6",
    sectionBg: format === "styled" ? "#fffbeb" : format === "professional" ? "#f8fafc" : "#f9fafb",
    text: format === "styled" ? "#451a03" : "#111827",
  };

  const themedColors = inkSaver
    ? {
        ...colors,
        chipBg: "transparent",
        sectionBg: "#ffffff",
        border: format === "styled" ? "#a8a29e" : format === "professional" ? "#94a3b8" : "#9ca3af",
      }
    : colors;

  const hasV = spell.components.includes("V");
  const hasS = spell.components.includes("S");
  const hasM = spell.components.includes("M");
  const showHigherLevel = Boolean(spell.higher_level);

  return (
    <div
      className={hasFixedHeight ? "break-inside-avoid" : ""}
      data-print-index={index}
      data-spell-id={spell.id}
      data-card-height-preset={cardHeightPreset}
      style={{
        marginBottom: "0",
        fontFamily: '"Segoe UI", Arial, sans-serif',
        fontSize: config.base,
        lineHeight: config.lineHeight,
        height: undefined,
        minHeight: hasFixedHeight ? cardHeight : undefined,
        display: "flex",
        flexDirection: "column",
        padding: "3mm",
        border: `1.5px solid ${themedColors.border}`,
        borderRadius: "2mm",
        background: themedColors.sectionBg,
        overflow: "visible",
        breakInside: hasFixedHeight ? "avoid" : "auto",
        pageBreakInside: hasFixedHeight ? "avoid" : "auto",
        color: themedColors.text,
      }}
    >
      {/* Header: Spell Name + Metadata */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1mm",
          marginBottom: "1.5mm",
          paddingBottom: "1.5mm",
          borderBottom: `2px solid ${themedColors.border}`,
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            fontSize: `calc(${config.title} + 1pt)`,
            color: themedColors.primary,
            lineHeight: "1.2",
          }}
        >
          {spell.name}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1mm",
          }}
        >
          <span
            style={{
              fontSize: config.label,
              color: themedColors.secondary,
              fontWeight: "700",
              border: `1px solid ${themedColors.border}`,
              borderRadius: "999px",
              padding: "0.2mm 1.4mm",
              background: themedColors.chipBg,
            }}
          >
            {levelDisplay}
          </span>
          <span
            style={{
              fontSize: config.label,
              color: themedColors.secondary,
              fontWeight: "700",
              border: `1px solid ${themedColors.border}`,
              borderRadius: "999px",
              padding: "0.2mm 1.4mm",
              background: themedColors.chipBg,
            }}
          >
            {spell.school}
          </span>
          {spell.ritual && (
            <span
              style={{
                fontSize: config.label,
                color: themedColors.secondary,
                fontWeight: "700",
                border: `1px solid ${themedColors.border}`,
                borderRadius: "999px",
                padding: "0.2mm 1.4mm",
                background: themedColors.chipBg,
              }}
            >
              Ritual
            </span>
          )}
        </div>
      </div>

      {/* Components block */}
      <div
        style={{
          marginBottom: "1.5mm",
          paddingBottom: "1mm",
          borderBottom: `1px solid ${themedColors.border}`,
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            color: themedColors.label,
            fontSize: config.label,
            marginBottom: "0.8mm",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Components
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1mm", flexWrap: "wrap" }}>
          {[
            { key: "V", active: hasV },
            { key: "S", active: hasS },
            { key: "M", active: hasM },
          ].map((entry) => (
            <span
              key={entry.key}
              style={{
                minWidth: "5mm",
                textAlign: "center",
                fontWeight: "700",
                fontSize: config.label,
                border: `1px solid ${themedColors.border}`,
                borderRadius: "1mm",
                padding: "0.5mm 1mm",
                background: entry.active ? themedColors.chipBg : "transparent",
                color: entry.active ? themedColors.primary : themedColors.label,
                opacity: entry.active ? 1 : 0.55,
              }}
            >
              {entry.key}
            </span>
          ))}
          {showMaterial && spell.material && (
            <span style={{ fontSize: config.label, color: themedColors.secondary }}>
              {spell.material}
            </span>
          )}
        </div>
      </div>

      {/* Quick reference stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1mm 2mm",
          marginBottom: "1.5mm",
          paddingBottom: "1.5mm",
          borderBottom: `1px solid ${themedColors.border}`,
        }}
      >
        <div>
          <div style={{ fontWeight: "700", color: themedColors.label, fontSize: config.label }}>
            Range
          </div>
          <div style={{ color: themedColors.primary, fontWeight: 600 }}>{spell.range}</div>
        </div>
        <div>
          <div style={{ fontWeight: "700", color: themedColors.label, fontSize: config.label }}>
            Casting Time
          </div>
          <div style={{ color: themedColors.primary, fontWeight: 600 }}>{spell.casting_time}</div>
        </div>
        <div>
          <div style={{ fontWeight: "700", color: themedColors.label, fontSize: config.label }}>
            Concentration
          </div>
          <div style={{ color: themedColors.primary, fontWeight: 600 }}>
            {spell.concentration ? "Yes" : "No"}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: "700", color: themedColors.label, fontSize: config.label }}>
            Duration
          </div>
          <div style={{ color: themedColors.primary, fontWeight: 600 }}>{spell.duration}</div>
        </div>
      </div>

      {/* Classes */}
      {showClasses && spell.class.length > 0 && (
        <div style={{ marginBottom: "1.5mm" }}>
          <div
            style={{
              fontWeight: "700",
              color: themedColors.label,
              fontSize: config.label,
              marginBottom: "0.8mm",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Classes
          </div>
          <div style={{ display: "flex", gap: "1mm", flexWrap: "wrap" }}>
            {spell.class.map((className) => (
              <span
                key={className}
                style={{
                  fontSize: config.label,
                  border: `1px solid ${themedColors.border}`,
                  borderRadius: "999px",
                  padding: "0.2mm 1.2mm",
                  color: themedColors.secondary,
                  background: themedColors.chipBg,
                  lineHeight: "1.2",
                }}
              >
                {className}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div
        style={{
          marginTop: "0.5mm",
          flex: "1 1 auto",
          color: "inherit",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflow: "visible",
          display: "block",
        }}
      >
        {parseSpellDescription(spell.desc)}
      </div>

      {/* Higher Level */}
      {showHigherLevel && showHigherLevels && (
        <div
          style={{
            marginTop: "1mm",
            paddingTop: "0.8mm",
            borderTop: `1px solid ${themedColors.border}`,
          }}
        >
          <span style={{ fontWeight: "bold", color: themedColors.primary }}>At Higher Levels:</span>{" "}
          <span style={{ color: themedColors.text }}>
            {parseSpellDescription(spell.higher_level ?? "")}
          </span>
        </div>
      )}
    </div>
  );
}
