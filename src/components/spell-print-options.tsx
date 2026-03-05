"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface PrintOptions {
  fontSize: "xsmall" | "small" | "medium" | "large";
  gridLayout: "1col" | "2col" | "3col";
  format: "monochrome" | "styled";
  sortBy: "name" | "level";
}

interface PrintOptionsComponentProps {
  options: PrintOptions;
  onOptionsChange: (options: PrintOptions) => void;
}

export function PrintOptionsComponent({ options, onOptionsChange }: PrintOptionsComponentProps) {
  return (
    <Card className="bg-background border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Print Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
      </CardContent>
    </Card>
  );
}
