"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";

export default function CampaignsPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
      party?: Array<{ id: string; name: string; profileImage?: string }>;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/campaigns");
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <Card className="p-8 text-center">
          <p className="mb-4">Please log in to view campaigns</p>
          <Button onClick={() => (window.location.href = "/login")}>Log In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-linear-to-b from-background via-background to-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Select a campaign to view details and manage your party.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <Spinner className="w-8 h-8 mx-auto" />
              <p className="text-muted-foreground">Loading campaigns...</p>
            </div>
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-lg text-muted-foreground mb-4">
              No campaigns yet. Create your first campaign!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    <Badge variant="outline">{campaign.party?.length || 0} characters</Badge>
                  </div>

                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mb-4">{campaign.description}</p>
                  )}

                  {campaign.party && campaign.party.length > 0 && (
                    <div className="mb-4">
                      <AvatarGroup>
                        {campaign.party.slice(0, 4).map((member) => (
                          <Tooltip key={member.id}>
                            <TooltipTrigger>
                              <Avatar size="lg">
                                <AvatarImage
                                  src={member.profileImage || undefined}
                                  alt={member.name}
                                  className="object-cover"
                                />
                                <AvatarFallback className="text-xs font-semibold">
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>{member.name}</TooltipContent>
                          </Tooltip>
                        ))}
                        {campaign.party.length > 4 && (
                          <AvatarGroupCount>+{campaign.party.length - 4}</AvatarGroupCount>
                        )}
                      </AvatarGroup>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/campaigns/${campaign.id}`;
                      }}
                    >
                      View
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
