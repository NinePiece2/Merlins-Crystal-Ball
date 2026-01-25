"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  party?: Array<{ characterId: string }>;
}

export default function AdminPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [addUserError, setAddUserError] = useState("");
  const [addUserSuccess, setAddUserSuccess] = useState("");
  const [addCampaignError, setAddCampaignError] = useState("");
  const [addCampaignSuccess, setAddCampaignSuccess] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [addingCampaign, setAddingCampaign] = useState(false);
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [originalAdminId, setOriginalAdminId] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;

    // Middleware ensures user is authenticated
    const isAdmin =
      session?.user &&
      "isAdmin" in session.user &&
      (session.user as unknown as { isAdmin: boolean }).isAdmin;

    if (!isAdmin) {
      router.push("/");
      return;
    }

    fetchUsers();
    fetchCampaigns();
  }, [session, isPending, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        // Find the original admin (first user created, or first admin)
        const firstAdmin = data.users.find((u: User) => u.isAdmin);
        if (firstAdmin) {
          setOriginalAdminId(firstAdmin.id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/campaigns");
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    }
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCampaign(true);
    setAddCampaignError("");
    setAddCampaignSuccess("");

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaignName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setAddCampaignError(data.message || "Failed to create campaign");
        return;
      }

      setAddCampaignSuccess("Campaign created successfully!");
      setNewCampaignName("");
      setShowAddCampaign(false);
      fetchCampaigns();
    } catch (err) {
      setAddCampaignError("An error occurred while creating the campaign");
      console.error(err);
    } finally {
      setAddingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCampaigns();
        setDeleteCampaignId(null);
      }
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    setAddUserError("");
    setAddUserSuccess("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName,
          password: newUserPassword,
          isAdmin: newUserIsAdmin,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setAddUserError(data.message || "Failed to add user");
        return;
      }

      setAddUserSuccess("User added successfully!");
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserIsAdmin(false);
      setShowAddUser(false);
      fetchUsers();
    } catch (err) {
      setAddUserError("An error occurred while adding the user");
      console.error(err);
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchUsers();
        setDeleteUserId(null);
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  };

  const generateStrongPassword = (): string => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()-_=+[]{}|;:,.<>?";
    const allChars = uppercase + lowercase + numbers + special;

    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = password.length; i < 16; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  };

  if (isPending) {
    return <div className="flex items-center justify-center h-screen">Checking access...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-linear-to-b from-background via-background to-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Manage users and system permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push("/admin/books")}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              Documents
            </Button>
            <Button onClick={() => setShowAddUser(true)} size="lg" className="gap-2">
              Add User
            </Button>
          </div>
        </div>

        {addUserSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-900 rounded-lg text-sm font-medium">
            ✓ {addUserSuccess}
          </div>
        )}

        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account and optionally assign admin privileges.
              </DialogDescription>
            </DialogHeader>

            {addUserError && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm font-medium">
                {addUserError}
              </div>
            )}

            <form onSubmit={handleAddUser} className="py-4">
              <FieldGroup className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="email">Email Address *</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="name">Full Name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password *</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      placeholder="••••••••"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewUserPassword(generateStrongPassword())}
                      className="whitespace-nowrap"
                    >
                      Generate
                    </Button>
                  </div>
                </Field>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-input bg-muted/50 hover:bg-muted transition-colors w-fit">
                  <Checkbox
                    id="isAdmin"
                    checked={newUserIsAdmin}
                    onCheckedChange={(checked) => setNewUserIsAdmin(checked === true)}
                  />
                  <FieldLabel htmlFor="isAdmin" className="mb-0 cursor-pointer text-sm">
                    Grant admin privileges
                  </FieldLabel>
                </div>

                <Field orientation="horizontal" className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddUser(false);
                      setAddUserError("");
                      setNewUserEmail("");
                      setNewUserName("");
                      setNewUserPassword("");
                      setNewUserIsAdmin(false);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addingUser} className="flex-1">
                    {addingUser ? "Adding..." : "Add User"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>

        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading users...</p>
          </Card>
        ) : users.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No users created yet.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.image || undefined} alt={user.email} />
                          <AvatarFallback className="text-xs">
                            {user.email.split("@")[0].substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.name || "—"}</TableCell>
                    <TableCell>
                      {user.id === originalAdminId ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className="cursor-help">Admin (Original)</Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Original admin created on setup - cannot be changed</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Select
                          value={user.isAdmin ? "admin" : "user"}
                          onValueChange={(value) => handleToggleAdmin(user.id, value === "admin")}
                        >
                          <SelectTrigger className="w-fit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {user.id === originalAdminId && (
                        <AlertDialog
                          open={deleteUserId === user.id}
                          onOpenChange={(open) => !open && setDeleteUserId(null)}
                        >
                          <AlertDialogTrigger>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled
                              className="text-xs"
                              title="Original admin cannot be deleted"
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cannot Delete Original Admin</AlertDialogTitle>
                              <AlertDialogDescription>
                                The original admin account cannot be deleted for security reasons.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex gap-2 justify-end pt-2">
                              <AlertDialogCancel>Close</AlertDialogCancel>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {user.id !== originalAdminId && (
                        <AlertDialog
                          open={deleteUserId === user.id}
                          onOpenChange={(open) => !open && setDeleteUserId(null)}
                        >
                          <AlertDialogTrigger>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteUserId(user.id)}
                              className="text-xs"
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{user.email}&quot;? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex gap-2 justify-end pt-2">
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Campaign Management Section */}
        <div className="mt-12 pt-8 border-t border-primary/10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Campaign Management</h2>
              <p className="text-lg text-muted-foreground mt-2">Create and manage campaigns</p>
            </div>
            <Button onClick={() => setShowAddCampaign(true)} size="lg" className="gap-2">
              Create Campaign
            </Button>
          </div>

          {addCampaignSuccess && (
            <div className="p-4 mb-6 bg-green-50 border border-green-200 text-green-900 rounded-lg text-sm font-medium">
              ✓ {addCampaignSuccess}
            </div>
          )}

          {showAddCampaign && (
            <Card className="p-8 border border-primary/10 mb-8">
              <h3 className="text-2xl font-bold tracking-tight mb-6">Create New Campaign</h3>

              {addCampaignError && (
                <div className="p-4 mb-6 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm font-medium">
                  {addCampaignError}
                </div>
              )}

              <form onSubmit={handleAddCampaign}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="campaignName">Campaign Name</FieldLabel>
                    <Input
                      id="campaignName"
                      type="text"
                      placeholder="Enter campaign name"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      required
                    />
                  </Field>

                  <Field orientation="horizontal">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddCampaign(false);
                        setAddCampaignError("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addingCampaign}>
                      {addingCampaign ? "Creating..." : "Create Campaign"}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-lg text-muted-foreground">No campaigns created yet.</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Characters</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {campaign.party?.length || 0} member
                        {campaign.party && campaign.party.length !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell>
                        <AlertDialog
                          open={deleteCampaignId === campaign.id}
                          onOpenChange={(open) => !open && setDeleteCampaignId(null)}
                        >
                          <AlertDialogTrigger>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteCampaignId(campaign.id)}
                              className="text-xs"
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{campaign.name}&quot;? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex gap-2 justify-end pt-2">
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
