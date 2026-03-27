"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getAllSpells, getAllSpellClasses, type Spell } from "@/lib/spells-server";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { SpellFilter } from "@/components/spell-filter";
import { PrintOptionsComponent, type PrintOptions } from "@/components/spell-print-options";
import { PrintableSpellReference } from "@/components/printable-spell-reference";

type PageTab = "filter" | "preview";

export default function SpellsPrintablePage() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [selectedSpells, setSelectedSpells] = useState<Set<string>>(new Set());
  const [spellSearchQuery, setSpellSearchQuery] = useState("");
  const [currentTab, setCurrentTab] = useState<PageTab>("filter");
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    fontSize: "small",
    gridLayout: "2col",
    format: "styled",
    sortBy: "name",
    cardHeightPreset: "standard",
    showClasses: true,
    showHigherLevels: true,
    showMaterial: true,
    inkSaver: false,
    paperSize: "A4",
    showPageNumbers: false,
    pageNumberFormat: "page-number",
    pageNumberPosition: "center",
  });

  const pageNumberContent =
    printOptions.pageNumberFormat === "number-only" ? "counter(page)" : '"Page " counter(page)';

  const pageNumberRules = printOptions.showPageNumbers
    ? printOptions.pageNumberPosition === "booklet"
      ? `
          @page:left {
            @bottom-left {
              content: ${pageNumberContent};
              font-size: 8.5pt;
              color: #374151;
              font-family: 'Segoe UI', 'Arial', sans-serif;
            }
          }
          @page:right {
            @bottom-right {
              content: ${pageNumberContent};
              font-size: 8.5pt;
              color: #374151;
              font-family: 'Segoe UI', 'Arial', sans-serif;
            }
          }
        `
      : printOptions.pageNumberPosition === "left"
        ? `
            @page {
              @bottom-left {
                content: ${pageNumberContent};
                font-size: 8.5pt;
                color: #374151;
                font-family: 'Segoe UI', 'Arial', sans-serif;
              }
            }
          `
        : printOptions.pageNumberPosition === "right"
          ? `
              @page {
                @bottom-right {
                  content: ${pageNumberContent};
                  font-size: 8.5pt;
                  color: #374151;
                  font-family: 'Segoe UI', 'Arial', sans-serif;
                }
              }
            `
          : `
              @page {
                @bottom-center {
                  content: ${pageNumberContent};
                  font-size: 8.5pt;
                  color: #374151;
                  font-family: 'Segoe UI', 'Arial', sans-serif;
                }
              }
            `
    : "";

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedSpells, loadedClasses] = await Promise.all([
          getAllSpells(),
          getAllSpellClasses(),
        ]);
        setSpells(loadedSpells);
        setClasses(loadedClasses);
      } catch (err) {
        console.error("Error loading spells:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleClassToggle = (className: string) => {
    const newClasses = new Set(selectedClasses);
    if (newClasses.has(className)) {
      newClasses.delete(className);
    } else {
      newClasses.add(className);
    }
    setSelectedClasses(newClasses);
  };

  const handleSelectAllClasses = () => {
    setSelectedClasses(new Set(classes));
  };

  const handleClearAllClasses = () => {
    setSelectedClasses(new Set());
  };

  const handleSpellToggle = (spellId: string) => {
    const newSpells = new Set(selectedSpells);
    if (newSpells.has(spellId)) {
      newSpells.delete(spellId);
    } else {
      newSpells.add(spellId);
    }
    setSelectedSpells(newSpells);
  };

  const handleSelectAllSpells = () => {
    const normalizedQuery = spellSearchQuery.trim().toLowerCase();
    const filteredSpells = spells.filter((spell) => {
      const matchesClass =
        selectedClasses.size === 0 || spell.class.some((cls) => selectedClasses.has(cls));

      if (!matchesClass) return false;
      if (!normalizedQuery) return true;

      const searchableText =
        `${spell.name} ${spell.id} ${spell.school} ${spell.level}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
    setSelectedSpells(new Set(filteredSpells.map((s) => s.id)));
  };

  const handleClearAllSpells = () => {
    setSelectedSpells(new Set());
  };

  const columnCount = {
    "1col": 1,
    "2col": 2,
    "3col": 3,
  }[printOptions.gridLayout];

  const estimateSpellCardHeight = useCallback((spell: Spell) => {
    const descriptionLength = (spell.desc?.length ?? 0) + (spell.higher_level?.length ?? 0);
    const classWeight = spell.class.length * 20;
    return 280 + descriptionLength * 0.33 + classWeight;
  }, []);

  const distributeToBalancedColumns = useCallback(
    (sourceSpells: Spell[]): Spell[][] => {
      const columns = Array.from({ length: columnCount }, () => ({
        totalHeight: 0,
        spells: [] as Spell[],
      }));

      sourceSpells.forEach((spell) => {
        let shortestColumnIndex = 0;
        for (let i = 1; i < columns.length; i++) {
          if (columns[i].totalHeight < columns[shortestColumnIndex].totalHeight) {
            shortestColumnIndex = i;
          }
        }

        columns[shortestColumnIndex].spells.push(spell);
        columns[shortestColumnIndex].totalHeight += estimateSpellCardHeight(spell);
      });

      return columns.map((column) => column.spells);
    },
    [columnCount, estimateSpellCardHeight],
  );

  // Get selected spell objects and sort them
  const selectedSpellObjects = spells.filter((spell) => selectedSpells.has(spell.id));

  if (printOptions.sortBy === "level") {
    selectedSpellObjects.sort((a, b) => {
      // Sort by level (cantrips first, then 1-9)
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      // If same level, sort by name
      return a.name.localeCompare(b.name);
    });
  } else {
    // Sort by name
    selectedSpellObjects.sort((a, b) => a.name.localeCompare(b.name));
  }

  const balancedColumns = useMemo(
    () => distributeToBalancedColumns(selectedSpellObjects),
    [distributeToBalancedColumns, selectedSpellObjects],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {/* Screen UI - not printed */}
      <div className="min-h-screen bg-background text-foreground no-print">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-2 no-print">Spell Printables</h1>
          <p className="text-muted-foreground mb-8 no-print">
            Select spells and customize your printable page
          </p>

          <Tabs
            value={currentTab}
            onValueChange={(v) => setCurrentTab(v as PageTab)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-muted border-border no-print">
              <TabsTrigger
                value="filter"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground cursor-pointer"
              >
                Select Spells
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground cursor-pointer"
                disabled={selectedSpells.size === 0}
              >
                Preview & Print ({selectedSpells.size})
              </TabsTrigger>
            </TabsList>

            {/* Filter Tab */}
            <TabsContent value="filter" className="space-y-6 no-print">
              <SpellFilter
                spells={spells}
                classes={classes}
                selectedClasses={selectedClasses}
                selectedSpells={selectedSpells}
                searchQuery={spellSearchQuery}
                onClassToggle={handleClassToggle}
                onSelectAll={handleSelectAllClasses}
                onClearAll={handleClearAllClasses}
                onSpellToggle={handleSpellToggle}
                onSearchQueryChange={setSpellSearchQuery}
              />

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={handleClearAllSpells}
                  className="text-foreground border-border hover:bg-muted"
                >
                  Clear Selected
                </Button>
                <Button
                  onClick={handleSelectAllSpells}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Select All Visible
                </Button>
              </div>

              <div className="flex flex-col items-end gap-2 pt-3">
                <Button
                  onClick={() => setCurrentTab("preview")}
                  disabled={selectedSpells.size === 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Continue to Preview & Print ({selectedSpells.size})
                </Button>
                {selectedSpells.size === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Select at least one spell to continue.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Options Sidebar */}
                <div className="lg:col-span-1 no-print">
                  <PrintOptionsComponent options={printOptions} onOptionsChange={setPrintOptions} />
                  <Button
                    onClick={() => window.print()}
                    className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10"
                  >
                    Print All Pages
                  </Button>
                </div>

                {/* Print Preview */}
                <div className="lg:col-span-3">
                  {/* Print Preview Container - shows all spells */}
                  <div className="no-print">
                    {/* Preview display */}
                    <div
                      className="bg-background text-foreground p-8 rounded border-2 border-primary shadow-lg"
                      style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* Main content columns - adaptive height, balanced distribution */}
                      <div
                        className="spell-columns"
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                          columnGap: printOptions.gridLayout === "3col" ? "3mm" : "4mm",
                        }}
                      >
                        {balancedColumns.map((columnSpells, columnIndex) => (
                          <div
                            key={`preview-column-${columnIndex}`}
                            className="spell-column"
                            style={{ display: "flex", flexDirection: "column", gap: "1.5mm" }}
                          >
                            {columnSpells.map((spell, idx) => (
                              <PrintableSpellReference
                                key={spell.id}
                                spell={spell}
                                format={printOptions.format}
                                fontSize={printOptions.fontSize}
                                cardHeightPreset={printOptions.cardHeightPreset}
                                showClasses={printOptions.showClasses}
                                showHigherLevels={printOptions.showHigherLevels}
                                showMaterial={printOptions.showMaterial}
                                inkSaver={printOptions.inkSaver}
                                index={idx}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Print-only: All spells in one grid - CSS handles page breaks naturally */}
      <div className="print-only" style={{ display: "none" }}>
        <div
          className="print-page"
          style={{
            padding: "6mm",
            boxSizing: "border-box",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="spell-columns"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              columnGap: printOptions.gridLayout === "3col" ? "3mm" : "4mm",
            }}
          >
            {balancedColumns.map((columnSpells, columnIndex) => (
              <div
                key={`print-column-${columnIndex}`}
                className="spell-column"
                style={{ display: "flex", flexDirection: "column", gap: "1.5mm" }}
              >
                {columnSpells.map((spell, idx) => (
                  <PrintableSpellReference
                    key={spell.id}
                    spell={spell}
                    format={printOptions.format}
                    fontSize={printOptions.fontSize}
                    cardHeightPreset={printOptions.cardHeightPreset}
                    showClasses={printOptions.showClasses}
                    showHigherLevels={printOptions.showHigherLevels}
                    showMaterial={printOptions.showMaterial}
                    inkSaver={printOptions.inkSaver}
                    index={idx}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
      .print-only {
        display: none !important;
      }
      .spell-columns .spell-column > div[data-print-index] {
        margin-bottom: 0;
      }
      /* Table styling for spell descriptions */
      table {
        border-collapse: collapse;
        margin: 0.5rem 0;
        font-size: inherit;
      }
      table thead tr {
        border-bottom: 2px solid currentColor;
      }
      table th,
      table td {
        padding: 0.25rem 0.5rem;
        text-align: left;
        border: none;
      }
      table th {
        font-weight: bold;
      }
      table tbody tr {
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }
      @media print {
        * {
          box-sizing: border-box;
        }
        html, body {
          background: white !important;
          color: black !important;
          margin: 0;
          padding: 0;
        }
        body div {
          background: transparent !important;
        }
        /* Hide all navigation elements */
        nav,
        [role="navigation"],
        [class*="nav"],
        [class*="header"],
        [class*="menu"],
        [class*="sidebar"] {
          display: none !important;
        }
        .no-print {
          display: none !important;
        }
        .print-only {
          display: block !important;
          position: relative;
        }
        .print-page {
          background: white !important;
          color: inherit !important;
          break-after: auto;
          page-break-after: auto;
          orphans: 2;
          widows: 2;
          padding: 6mm;
          margin: 0;
          display: flex;
          flex-direction: column;
        }
        .print-page .spell-columns .spell-column > div[data-card-height-preset="variable"] {
          break-inside: auto;
          page-break-inside: auto;
        }
        /* Spell reference styling for print */
        .print-page div[data-print-index]:not([data-card-height-preset="variable"]) {
          color: #000 !important;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .print-page div[data-print-index][data-card-height-preset="variable"] {
          color: #000 !important;
          page-break-inside: auto;
          break-inside: auto;
        }
        .print-page div[data-print-index] div {
          color: inherit !important;
        }
        .print-page div[data-print-index] span {
          color: inherit !important;
        }
        /* Table styling for spell data */
        .print-page table {
          border-collapse: collapse;
          width: 100%;
          margin: 1mm 0;
          font-size: inherit;
        }
        .print-page table thead tr {
          border-bottom: 1px solid #000;
        }
        .print-page table th,
        .print-page table td {
          padding: 1mm 2mm;
          text-align: left;
          color: #000 !important;
          border: none;
        }
        .print-page table th {
          font-weight: bold;
          background: transparent !important;
        }
        .print-page table tbody tr {
          border-bottom: 0.5px solid #999;
        }
        .print-page table tbody tr:last-child {
          border-bottom: 1px solid #000;
        }
        /* Ensure text is readable */
        .print-page {
          font-family: 'Segoe UI', 'Arial', sans-serif;
          color: #000;
        }
        .print-page * {
          color: inherit !important;
        }
        @page {
          size: ${printOptions.paperSize};
          margin: 8mm;
          orphans: 2;
          widows: 2;
        }
        ${pageNumberRules}
      }
    `}</style>
    </>
  );
}
