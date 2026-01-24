"use client";

import React from "react";

/**
 * Parse simple HTML tags from spell descriptions and convert to React components
 * Supports: <b>, <i>, <b><i>, nested combinations
 *
 * @param text - Text potentially containing HTML tags
 * @returns React elements with proper formatting
 */
export function parseSpellDescription(text: string): React.ReactNode {
  if (!text) return null;

  // Split by tags while preserving them
  const parts = text.split(/(<\/?[bi]>)/);

  let isBold = false;
  let isItalic = false;
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const part of parts) {
    if (part === "") continue;

    switch (part) {
      case "<b>":
        isBold = true;
        break;
      case "</b>":
        isBold = false;
        break;
      case "<i>":
        isItalic = true;
        break;
      case "</i>":
        isItalic = false;
        break;
      default:
        if (part.trim()) {
          // Wrap the text with appropriate styling
          let element: React.ReactNode = part;

          if (isBold && isItalic) {
            element = (
              <span key={key} className="font-semibold italic">
                {part}
              </span>
            );
          } else if (isBold) {
            element = (
              <span key={key} className="font-semibold">
                {part}
              </span>
            );
          } else if (isItalic) {
            element = (
              <span key={key} className="italic">
                {part}
              </span>
            );
          } else {
            element = <span key={key}>{part}</span>;
          }

          elements.push(element);
          key++;
        }
        break;
    }
  }

  return <>{elements}</>;
}
