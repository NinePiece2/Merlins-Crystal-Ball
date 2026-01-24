"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

interface Campaign {
  id: string;
  name: string;
}

interface CharacterFormData {
  name: string;
  profileImage?: File;
  campaignId: string;
}

interface CharacterFormProps {
  onSubmit: (data: CharacterFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<CharacterFormData>;
  isLoading?: boolean;
}

export function CharacterForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: CharacterFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    profileImage: (initialData?.profileImage || null) as File | null,
    campaignId: initialData?.campaignId || "",
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load campaigns when component mounts
    (async () => {
      try {
        const response = await fetch("/api/campaigns");
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data);
        }
      } catch (err) {
        console.error("Failed to fetch campaigns:", err);
      }
    })();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profileImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCampaignChange = (campaignId: string | null) => {
    // Only update if a value is actually selected (not null/empty)
    if (campaignId) {
      setFormData((prev) => ({ ...prev, campaignId }));
    }
  };

  const getSelectedCampaignName = () => {
    if (!formData.campaignId) return "";
    const campaign = campaigns.find((c) => c.id === formData.campaignId);
    return campaign?.name || "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Character name is required");
      return;
    }

    if (!formData.campaignId.trim()) {
      setError("Campaign is required");
      return;
    }

    try {
      await onSubmit({
        name: formData.name,
        profileImage: formData.profileImage || undefined,
        campaignId: formData.campaignId,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save character";
      setError(errorMsg);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      profileImage: null,
      campaignId: "",
    });
    setPreview(null);
    setError("");
    onCancel?.();
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Character Name *</FieldLabel>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Enter character name"
              disabled={isLoading}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="profileImage">Profile Picture (Optional)</FieldLabel>
            <div className="space-y-2">
              <Input
                id="profileImage"
                name="profileImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isLoading}
              />
              {preview && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-input">
                  <Image src={preview} alt="Character preview" fill className="object-cover" />
                </div>
              )}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="campaign">Campaign *</FieldLabel>
            <Combobox
              items={campaigns}
              value={formData.campaignId}
              onValueChange={handleCampaignChange}
            >
              <ComboboxInput
                id="campaign"
                placeholder="Select a campaign"
                disabled={isLoading}
                value={getSelectedCampaignName()}
              />
              <ComboboxContent>
                <ComboboxEmpty>No campaigns found.</ComboboxEmpty>
                <ComboboxList>
                  {(campaign: Campaign) => (
                    <ComboboxItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>

          {error && <div className="text-sm text-destructive font-medium">{error}</div>}

          <Field orientation="horizontal">
            <Button type="submit" disabled={isLoading} size="lg">
              {isLoading ? "Saving..." : "Create Character"}
            </Button>
            <Button variant="outline" type="button" disabled={isLoading} onClick={handleCancel}>
              Cancel
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </Card>
  );
}
