"use client";

import React from "react";

/**
 * Parse markdown-style tables from spell descriptions
 * Handles various formats including those using > as row separators or || as line breaks
 */
function parseMarkdownTable(
  text: string,
): { headers: string[]; rows: Array<Record<string, string>> } | null {
  if (!text.includes("|")) return null;

  // Normalize the text by replacing delimiter patterns with newlines
  const normalizedText = text
    .replace(/\s*\|\s*>\s*/g, "\n|") // |> becomes newline + |
    .replace(/>[\s]*\|/g, "|\n") // >| becomes | + newline
    .replace(/\s+>\s+/g, "\n") // > alone becomes newline
    .replace(/\|\s*\|/g, "\n|") // || becomes newline + | (for tables without proper line breaks)
    .replace(/\s*\n\s*/g, "\n"); // \n becomes newline delimiter

  const lines = normalizedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && l.includes("|"));

  if (lines.length < 3) return null;

  // A table consists of: header row, separator row, and data rows
  // Find separator row - looks like |---|---|---| with at least one dash
  let headerRowIdx = -1;
  let separatorRowIdx = -1;

  for (let i = 0; i < Math.min(lines.length - 1, lines.length); i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

    // Check if next line is a separator (contains pipes and dashes)
    if (
      nextLine &&
      /\|[\s\-|:]*-[\s\-|:]*\|/.test(nextLine) &&
      !line.match(/^[\s]*\|[\s\-|:]*-[\s\-|:]*\|[\s]*$/)
    ) {
      headerRowIdx = i;
      separatorRowIdx = i + 1;
      break;
    }
  }

  // If no separator found in expected location, try to find it anywhere
  if (headerRowIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (/^[\s]*\|[\s\-|:]*-[\s\-|:]*\|[\s]*$/.test(lines[i])) {
        separatorRowIdx = i;
        headerRowIdx = i - 1;
        if (headerRowIdx >= 0) break;
      }
    }
  }

  if (headerRowIdx === -1 || separatorRowIdx === -1 || headerRowIdx < 0) {
    return null;
  }

  // Parse header row
  const headerLine = lines[headerRowIdx];
  const headerCells = headerLine
    .split("|")
    .map((cell) =>
      cell
        .trim()
        .replace(/^[\s>]+/, "")
        .replace(/[\s>]+$/, "")
        .trim(),
    ) // Remove > from start/end
    .filter((cell) => cell && cell.length > 0 && !cell.match(/^[\s\-:>]+$/));

  if (headerCells.length < 1) return null;

  // Parse data rows
  const rows: Array<Record<string, string>> = [];
  for (let i = separatorRowIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("|")) continue;

    const cells = line
      .split("|")
      .map((cell) =>
        cell
          .trim()
          .replace(/^[\s>]+/, "")
          .replace(/[\s>]+$/, "")
          .trim(),
      ) // Remove > from start/end
      .filter((cell) => cell && cell.length > 0 && !cell.match(/^[\s\-:>]+$/));

    if (cells.length > 0) {
      const row: Record<string, string> = {};
      headerCells.forEach((header, idx) => {
        row[header] = cells[idx] || "";
      });
      rows.push(row);
    }
  }

  if (rows.length === 0) return null;

  return { headers: headerCells, rows };
}

/**
 * Helper function to parse HTML tags (<b>, <i>) in text and return styled React elements
 */
function parseFormattedText(text: string): React.ReactNode {
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

/**
 * Parse simple HTML tags from spell descriptions and convert to React components
 * Supports: <b>, <i>, <b><i>, nested combinations, and table data
 *
 * @param text - Text potentially containing HTML tags and table data
 * @returns React elements with proper formatting
 */
export function parseSpellDescription(text: string): React.ReactNode {
  if (!text) return null;

  // Clean up the text - remove leading > characters that are used as delimiters
  const cleanedText = text.replace(/^\s*>\s*/, "").trim();
  if (!cleanedText) return null;

  // Render mixed text/table content by paragraph block so descriptions that contain
  // one or more tables still keep all surrounding prose.
  const blocks = cleanedText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const renderTable = (
    tableData: { headers: string[]; rows: Array<Record<string, string>> },
    key: string,
  ) => (
    <div key={key} style={{ overflowX: "auto", maxWidth: "100%", width: "100%" }}>
      <table
        style={{
          borderCollapse: "collapse",
          marginTop: "0.5rem",
          marginBottom: "0.5rem",
          width: "100%",
          fontSize: "0.9em",
          lineHeight: "inherit",
          tableLayout: "auto",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "2px solid currentColor",
            }}
          >
            {tableData.headers.map((header, idx) => (
              <th
                key={`${key}-h-${idx}`}
                style={{
                  padding: "3px 6px",
                  textAlign: "left",
                  fontWeight: "bold",
                }}
              >
                {parseFormattedText(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, rowIdx) => (
            <tr
              key={`${key}-r-${rowIdx}`}
              style={{
                borderBottom: "1px solid rgba(0,0,0,0.2)",
              }}
            >
              {tableData.headers.map((header, colIdx) => (
                <td
                  key={`${key}-r-${rowIdx}-c-${colIdx}`}
                  style={{
                    padding: "3px 6px",
                  }}
                >
                  {parseFormattedText(row[header] || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Parse block content including text and tables
  const parseBlockContent = (block: string, blockIdx: number): React.ReactNode => {
    // Split block into lines
    const lines = block.split("\n");
    const content: React.ReactNode[] = [];
    let currentTextLines: string[] = [];
    let elementKey = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this is a table line (contains |)
      if (line.includes("|")) {
        // Try to parse a table starting from this line
        const remainingLines = lines.slice(i).join("\n");
        const tableData = parseMarkdownTable(remainingLines);

        if (tableData && tableData.rows.length > 0 && tableData.headers.length > 0) {
          // Flush any accumulated text
          if (currentTextLines.length > 0) {
            const textBlock = currentTextLines.join("\n").trim();
            if (textBlock) {
              content.push(
                <div key={`text-${blockIdx}-${elementKey}`} style={{ marginBottom: "0.4rem" }}>
                  {parseFormattedText(textBlock)}
                </div>,
              );
              elementKey++;
            }
            currentTextLines = [];
          }

          // Render the table
          content.push(renderTable(tableData, `table-${blockIdx}-${elementKey}`));
          elementKey++;

          // Skip lines that were part of the table
          // Count table lines: header + separator + rows
          const tableLineCount = 2 + tableData.rows.length; // header + separator + data rows
          i += tableLineCount - 1; // -1 because loop will increment
        } else {
          // Not a valid table, treat as regular text
          currentTextLines.push(line);
        }
      } else {
        // Regular text line
        currentTextLines.push(line);
      }
    }

    // Flush any remaining text
    if (currentTextLines.length > 0) {
      const textBlock = currentTextLines.join("\n").trim();
      if (textBlock) {
        content.push(
          <div key={`text-${blockIdx}-${elementKey}`} style={{ marginBottom: 0 }}>
            {parseFormattedText(textBlock)}
          </div>,
        );
      }
    }

    return content.length > 0 ? <>{content}</> : null;
  };

  return (
    <>
      {blocks.map((block, idx) => {
        const tableData = parseMarkdownTable(block);

        if (tableData && tableData.rows.length > 0 && tableData.headers.length > 0) {
          // If the entire block is just a table, render it
          const textBeforeTable = block.split("|")[0].trim();
          if (!textBeforeTable) {
            return renderTable(tableData, `table-${idx}`);
          }
        }

        // Parse block with mixed content
        return (
          <div
            key={`block-${idx}`}
            style={{ marginBottom: idx < blocks.length - 1 ? "0.4rem" : 0 }}
          >
            {parseBlockContent(block, idx)}
          </div>
        );
      })}
    </>
  );
}
