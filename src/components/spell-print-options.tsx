"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export interface PrintOptions {
  fontSize: "xsmall" | "small" | "medium" | "large";
  gridLayout: "1col" | "2col" | "3col";
  format: "monochrome" | "styled" | "professional";
  sortBy: "name" | "level";
  cardHeightPreset: "compact" | "standard" | "generous" | "variable";
  showClasses: boolean;
  showHigherLevels: boolean;
  showMaterial: boolean;
  inkSaver: boolean;
  paperSize: "A4" | "Letter";
  showPageNumbers: boolean;
  pageNumberFormat: "page-number" | "number-only";
  pageNumberPosition: "center" | "left" | "right" | "booklet";
}

interface PrintOptionsComponentProps {
  options: PrintOptions;
  onOptionsChange: (options: PrintOptions) => void;
}

const CUSTOM_PRESET_KEY = "spell-print-options-custom-preset-v1";

type StoredPreset = {
  version: 1;
  savedAt: string;
  options: Partial<PrintOptions>;
};

const FONT_SIZES: PrintOptions["fontSize"][] = ["xsmall", "small", "medium", "large"];
const GRID_LAYOUTS: PrintOptions["gridLayout"][] = ["1col", "2col", "3col"];
const FORMATS: PrintOptions["format"][] = ["monochrome", "styled", "professional"];
const SORT_OPTIONS: PrintOptions["sortBy"][] = ["name", "level"];
const CARD_HEIGHT_PRESETS: PrintOptions["cardHeightPreset"][] = [
  "compact",
  "standard",
  "generous",
  "variable",
];
const PAPER_SIZES: PrintOptions["paperSize"][] = ["A4", "Letter"];
const PAGE_NUMBER_FORMATS: PrintOptions["pageNumberFormat"][] = ["page-number", "number-only"];
const PAGE_NUMBER_POSITIONS: PrintOptions["pageNumberPosition"][] = [
  "center",
  "left",
  "right",
  "booklet",
];

function isInList<T extends string>(value: unknown, list: readonly T[]): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

function sanitizePrintOptions(partial: Partial<PrintOptions>, current: PrintOptions): PrintOptions {
  return {
    ...current,
    fontSize: isInList(partial.fontSize, FONT_SIZES) ? partial.fontSize : current.fontSize,
    gridLayout: isInList(partial.gridLayout, GRID_LAYOUTS)
      ? partial.gridLayout
      : current.gridLayout,
    format: isInList(partial.format, FORMATS) ? partial.format : current.format,
    sortBy: isInList(partial.sortBy, SORT_OPTIONS) ? partial.sortBy : current.sortBy,
    cardHeightPreset: isInList(partial.cardHeightPreset, CARD_HEIGHT_PRESETS)
      ? partial.cardHeightPreset
      : current.cardHeightPreset,
    showClasses:
      typeof partial.showClasses === "boolean" ? partial.showClasses : current.showClasses,
    showHigherLevels:
      typeof partial.showHigherLevels === "boolean"
        ? partial.showHigherLevels
        : current.showHigherLevels,
    showMaterial:
      typeof partial.showMaterial === "boolean" ? partial.showMaterial : current.showMaterial,
    inkSaver: typeof partial.inkSaver === "boolean" ? partial.inkSaver : current.inkSaver,
    paperSize: isInList(partial.paperSize, PAPER_SIZES) ? partial.paperSize : current.paperSize,
    showPageNumbers:
      typeof partial.showPageNumbers === "boolean"
        ? partial.showPageNumbers
        : current.showPageNumbers,
    pageNumberFormat: isInList(partial.pageNumberFormat, PAGE_NUMBER_FORMATS)
      ? partial.pageNumberFormat
      : current.pageNumberFormat,
    pageNumberPosition: isInList(partial.pageNumberPosition, PAGE_NUMBER_POSITIONS)
      ? partial.pageNumberPosition
      : current.pageNumberPosition,
  };
}

export function PrintOptionsComponent({ options, onOptionsChange }: PrintOptionsComponentProps) {
  const [hasCustomPreset, setHasCustomPreset] = React.useState(false);
  const [presetStatus, setPresetStatus] = React.useState<string | null>(null);
  const [savedAtText, setSavedAtText] = React.useState<string | null>(null);

  const updatePresetAvailability = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(CUSTOM_PRESET_KEY);
    setHasCustomPreset(Boolean(raw));

    if (!raw) {
      setSavedAtText(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredPreset | Partial<PrintOptions>;
      const savedAt =
        "savedAt" in parsed && typeof parsed.savedAt === "string" ? new Date(parsed.savedAt) : null;
      setSavedAtText(savedAt && !Number.isNaN(savedAt.getTime()) ? savedAt.toLocaleString() : null);
    } catch {
      setSavedAtText(null);
    }
  }, []);

  React.useEffect(() => {
    updatePresetAvailability();
  }, [updatePresetAvailability]);

  const applyPreset = (preset: "table-reference" | "compact-handout" | "archive-copy") => {
    if (preset === "table-reference") {
      onOptionsChange({
        ...options,
        fontSize: "medium",
        gridLayout: "2col",
        format: "professional",
        cardHeightPreset: "variable",
        showClasses: true,
        showMaterial: true,
        showHigherLevels: true,
        inkSaver: false,
        paperSize: "A4",
      });
      return;
    }

    if (preset === "compact-handout") {
      onOptionsChange({
        ...options,
        fontSize: "small",
        gridLayout: "3col",
        format: "professional",
        cardHeightPreset: "compact",
        showClasses: false,
        showMaterial: false,
        showHigherLevels: false,
        inkSaver: true,
      });
      return;
    }

    onOptionsChange({
      ...options,
      fontSize: "small",
      gridLayout: "2col",
      format: "monochrome",
      cardHeightPreset: "standard",
      showClasses: true,
      showMaterial: true,
      showHigherLevels: true,
      inkSaver: true,
      showPageNumbers: true,
      pageNumberFormat: "number-only",
      pageNumberPosition: "center",
    });
  };

  const saveCustomPreset = () => {
    if (typeof window === "undefined") return;
    const payload: StoredPreset = {
      version: 1,
      savedAt: new Date().toISOString(),
      options,
    };
    window.localStorage.setItem(CUSTOM_PRESET_KEY, JSON.stringify(payload));
    setPresetStatus("Custom preset saved");
    updatePresetAvailability();
  };

  const loadCustomPreset = () => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(CUSTOM_PRESET_KEY);
    if (!raw) {
      setPresetStatus("No saved custom preset found");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredPreset | Partial<PrintOptions>;
      const loaded =
        parsed && typeof parsed === "object" && "version" in parsed && "options" in parsed
          ? parsed.options
          : parsed;

      onOptionsChange(sanitizePrintOptions(loaded, options));
      setPresetStatus("Custom preset loaded");
      updatePresetAvailability();
    } catch {
      setPresetStatus("Saved preset is invalid and could not be loaded");
    }
  };

  const clearCustomPreset = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(CUSTOM_PRESET_KEY);
    setPresetStatus("Custom preset removed");
    updatePresetAvailability();
  };

  React.useEffect(() => {
    if (!presetStatus) return;
    const timeout = window.setTimeout(() => setPresetStatus(null), 2200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [presetStatus]);

  const handleApplyPreset = (preset: "table-reference" | "compact-handout" | "archive-copy") => {
    applyPreset(preset);
    setPresetStatus("Preset applied");
  };

  const presetDescription = hasCustomPreset
    ? savedAtText
      ? `Custom preset available (saved ${savedAtText})`
      : "Custom preset available"
    : "No custom preset saved yet";

  const saveLabel = hasCustomPreset ? "Update Custom Preset" : "Save Custom Preset";
  const statusClassName =
    presetStatus && presetStatus.includes("invalid")
      ? "text-xs text-destructive"
      : "text-xs text-emerald-600 dark:text-emerald-400";

  return (
    <Card className="bg-background border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Print Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Presets */}
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="space-y-1">
            <Label className="text-foreground font-semibold">Quick Presets</Label>
            <p className="text-xs text-muted-foreground">{presetDescription}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleApplyPreset("table-reference")}
              className="w-full h-auto py-2 leading-tight whitespace-normal"
            >
              Table Reference
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleApplyPreset("compact-handout")}
              className="w-full h-auto py-2 leading-tight whitespace-normal"
            >
              Compact Handout
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleApplyPreset("archive-copy")}
              className="w-full h-auto py-2 leading-tight whitespace-normal sm:col-span-2"
            >
              Archive Copy
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              onClick={saveCustomPreset}
              className="w-full h-auto py-2 leading-tight whitespace-normal"
            >
              {saveLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={loadCustomPreset}
              disabled={!hasCustomPreset}
              className="w-full h-auto py-2 leading-tight whitespace-normal"
            >
              Load Custom Preset
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={clearCustomPreset}
              disabled={!hasCustomPreset}
              className="w-full h-auto py-2 leading-tight whitespace-normal"
            >
              Clear Custom Preset
            </Button>
          </div>
          {presetStatus && <p className={statusClassName}>{presetStatus}</p>}
        </div>

        {/* Font Size */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Font Size</Label>
          <Select
            value={options.fontSize}
            onValueChange={(value) =>
              onOptionsChange({ ...options, fontSize: value as PrintOptions["fontSize"] })
            }
          >
            <SelectTrigger className="bg-muted border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xsmall">Extra Small (dense)</SelectItem>
              <SelectItem value="small">Small (compact)</SelectItem>
              <SelectItem value="medium">Medium (default)</SelectItem>
              <SelectItem value="large">Large (readable)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid Layout */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Grid Layout</Label>
          <RadioGroup
            value={options.gridLayout}
            onValueChange={(value) =>
              onOptionsChange({ ...options, gridLayout: value as PrintOptions["gridLayout"] })
            }
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="1col" id="layout-1col" />
              <Label htmlFor="layout-1col" className="text-foreground cursor-pointer font-normal">
                1 Column
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="2col" id="layout-2col" />
              <Label htmlFor="layout-2col" className="text-foreground cursor-pointer font-normal">
                2 Columns
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="3col" id="layout-3col" />
              <Label htmlFor="layout-3col" className="text-foreground cursor-pointer font-normal">
                3 Columns
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Format Style */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Card Format</Label>
          <RadioGroup
            value={options.format}
            onValueChange={(value) =>
              onOptionsChange({ ...options, format: value as PrintOptions["format"] })
            }
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="monochrome" id="format-mono" />
              <Label htmlFor="format-mono" className="text-foreground cursor-pointer font-normal">
                Monochrome (simple, printer-friendly)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="styled" id="format-styled" />
              <Label htmlFor="format-styled" className="text-foreground cursor-pointer font-normal">
                Styled (colored, like hover cards)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="professional" id="format-professional" />
              <Label
                htmlFor="format-professional"
                className="text-foreground cursor-pointer font-normal"
              >
                Professional (cool neutral accents)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Content Sections */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Content Sections</Label>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-classes"
              checked={options.showClasses}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, showClasses: checked === true })
              }
            />
            <Label htmlFor="show-classes" className="text-foreground cursor-pointer font-normal">
              Show classes badges
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-material"
              checked={options.showMaterial}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, showMaterial: checked === true })
              }
            />
            <Label htmlFor="show-material" className="text-foreground cursor-pointer font-normal">
              Show material text (M details)
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-higher-levels"
              checked={options.showHigherLevels}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, showHigherLevels: checked === true })
              }
            />
            <Label
              htmlFor="show-higher-levels"
              className="text-foreground cursor-pointer font-normal"
            >
              Show At Higher Levels section
            </Label>
          </div>
        </div>

        {/* Print Output */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Print Output</Label>

          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Paper Size</Label>
            <Select
              value={options.paperSize}
              onValueChange={(value) =>
                onOptionsChange({ ...options, paperSize: value as PrintOptions["paperSize"] })
              }
            >
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="Letter">Letter (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="ink-saver"
              checked={options.inkSaver}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, inkSaver: checked === true })
              }
            />
            <Label htmlFor="ink-saver" className="text-foreground cursor-pointer font-normal">
              Ink saver mode (lighter backgrounds and borders)
            </Label>
          </div>
        </div>

        {/* Card Height Preset */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Card Height</Label>
          <RadioGroup
            value={options.cardHeightPreset}
            onValueChange={(value) =>
              onOptionsChange({
                ...options,
                cardHeightPreset: value as PrintOptions["cardHeightPreset"],
              })
            }
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="compact" id="height-compact" />
              <Label
                htmlFor="height-compact"
                className="text-foreground cursor-pointer font-normal"
              >
                Compact (8cm, max info)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="standard" id="height-standard" />
              <Label
                htmlFor="height-standard"
                className="text-foreground cursor-pointer font-normal"
              >
                Standard (12cm)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="generous" id="height-generous" />
              <Label
                htmlFor="height-generous"
                className="text-foreground cursor-pointer font-normal"
              >
                Generous (15cm, readable)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="variable" id="height-variable" />
              <Label
                htmlFor="height-variable"
                className="text-foreground cursor-pointer font-normal"
              >
                Variable (full content)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Sort By */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Sort Spells By</Label>
          <RadioGroup
            value={options.sortBy}
            onValueChange={(value) =>
              onOptionsChange({ ...options, sortBy: value as PrintOptions["sortBy"] })
            }
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="name" id="sort-name" />
              <Label htmlFor="sort-name" className="text-foreground cursor-pointer font-normal">
                Name (A-Z)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="level" id="sort-level" />
              <Label htmlFor="sort-level" className="text-foreground cursor-pointer font-normal">
                Spell Level (Cantrips → 9)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Page Numbers */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Page Numbers</Label>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-page-numbers"
              checked={options.showPageNumbers}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, showPageNumbers: checked === true })
              }
            />
            <Label
              htmlFor="show-page-numbers"
              className="text-foreground cursor-pointer font-normal"
            >
              Show page numbers
            </Label>
          </div>

          {options.showPageNumbers && (
            <>
              <div className="space-y-2 pt-1">
                <Label className="text-foreground font-semibold">Number Format</Label>
                <RadioGroup
                  value={options.pageNumberFormat}
                  onValueChange={(value) =>
                    onOptionsChange({
                      ...options,
                      pageNumberFormat: value as PrintOptions["pageNumberFormat"],
                    })
                  }
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="page-number" id="page-format-page-number" />
                    <Label
                      htmlFor="page-format-page-number"
                      className="text-foreground cursor-pointer font-normal"
                    >
                      Page 1
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="number-only" id="page-format-number-only" />
                    <Label
                      htmlFor="page-format-number-only"
                      className="text-foreground cursor-pointer font-normal"
                    >
                      1
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2 pt-1">
                <Label className="text-foreground font-semibold">Position</Label>
                <RadioGroup
                  value={options.pageNumberPosition}
                  onValueChange={(value) =>
                    onOptionsChange({
                      ...options,
                      pageNumberPosition: value as PrintOptions["pageNumberPosition"],
                    })
                  }
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="center" id="page-pos-center" />
                    <Label
                      htmlFor="page-pos-center"
                      className="text-foreground cursor-pointer font-normal"
                    >
                      Bottom center
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="left" id="page-pos-left" />
                    <Label
                      htmlFor="page-pos-left"
                      className="text-foreground cursor-pointer font-normal"
                    >
                      Bottom left
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="right" id="page-pos-right" />
                    <Label
                      htmlFor="page-pos-right"
                      className="text-foreground cursor-pointer font-normal"
                    >
                      Bottom right
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="booklet" id="page-pos-booklet" />
                    <Label
                      htmlFor="page-pos-booklet"
                      className="text-foreground cursor-pointer font-normal"
                    >
                      Booklet (alternate left/right)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
