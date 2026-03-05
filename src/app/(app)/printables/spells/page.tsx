"use client";

import React, { useState, useEffect } from "react";
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
  const [currentTab, setCurrentTab] = useState<PageTab>("filter");
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    fontSize: "small",
    gridLayout: "2col",
    format: "styled",
    sortBy: "name",
  });
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
    const filteredSpells = spells.filter(
      (spell) => selectedClasses.size === 0 || spell.class.some((cls) => selectedClasses.has(cls)),
    );
    setSelectedSpells(new Set(filteredSpells.map((s) => s.id)));
  };

  const handleClearAllSpells = () => {
    setSelectedSpells(new Set());
  };

  // Calculate grid columns based on layout
  const gridColsClass = {
    "1col": "grid-cols-1",
    "2col": "grid-cols-2",
    "3col": "grid-cols-3",
  }[printOptions.gridLayout];

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

  // Show all spells in preview
  const currentPageSpells = selectedSpellObjects;

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
                onClassToggle={handleClassToggle}
                onSelectAll={handleSelectAllClasses}
                onClearAll={handleClearAllClasses}
                onSpellToggle={handleSpellToggle}
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
                      {/* Main content grid - fills all available space */}
                      <div
                        className={`grid gap-2 ${gridColsClass}`}
                        style={{
                          alignContent: "start",
                          gridAutoRows: "max-content",
                          gridAutoFlow: "dense",
                        }}
                      >
                        {currentPageSpells.map((spell, idx) => (
                          <PrintableSpellReference
                            key={spell.id}
                            spell={spell}
                            format={printOptions.format}
                            fontSize={printOptions.fontSize}
                            index={idx}
                          />
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
          {/* Main content grid - CSS will break pages automatically */}
          <div
            className={`grid ${gridColsClass}`}
            style={{ alignContent: "start", gap: "1.5mm", gridAutoFlow: "dense" }}
          >
            {selectedSpellObjects.map((spell, idx) => (
              <PrintableSpellReference
                key={spell.id}
                spell={spell}
                format={printOptions.format}
                fontSize={printOptions.fontSize}
                index={idx}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
      .print-only {
        display: none !important;
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
          break-after: page;
          page-break-after: always;
          orphans: 2;
          widows: 2;
          padding: 6mm;
          margin: 0;
          display: flex;
          flex-direction: column;
        }
        .print-page > div {
          display: contents;
        }
        .print-page .grid {
          display: grid !important;
          width: 100%;
          gap: 1.5mm !important;
          auto-rows: max-content;
          grid-auto-flow: dense;
        }
        .print-page .grid-cols-1 {
          grid-template-columns: 1fr !important;
        }
        .print-page .grid-cols-2 {
          grid-template-columns: repeat(2, 1fr) !important;
          column-gap: 4mm !important;
        }
        .print-page .grid-cols-3 {
          grid-template-columns: repeat(3, 1fr) !important;
          column-gap: 3mm !important;
        }
        /* Spell reference styling for print */
        .print-page div[data-print-index] {
          color: #000 !important;
          page-break-inside: avoid;
          break-inside: avoid;
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
          font-size: 10pt;
          line-height: 1.3;
          color: #000;
        }
        .print-page * {
          color: inherit !important;
        }
        @page {
          size: A4;
          margin: 8mm;
          orphans: 2;
          widows: 2;
        }
      }
    `}</style>
    </>
  );
}
