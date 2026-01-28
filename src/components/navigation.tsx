"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Menu, X, Home, Compass, Settings, LogOut, Shield, Book } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "@/lib/auth-client";

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isHomePage = pathname === "/";
  const isCampaignsPage = pathname?.startsWith("/campaigns");

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Don't show anything if no session and not loading (user shouldn't be here)
  if (!session && !isPending) {
    return null;
  }

  const user = session?.user;

  const isAdmin = user && "isAdmin" in user && (user as unknown as { isAdmin: boolean }).isAdmin;

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };
  return (
    <motion.div
      className="bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Desktop Navigation */}
            <motion.div
              className="hidden lg:flex items-center gap-2"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.button
                onClick={() => router.push("/")}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* <IconOne className="h-12 w-12" /> */}

                <span className="hidden sm:block">
                  <span className="block text-black dark:text-white font-bold text-xl">
                    Merlin&apos;s Crystal Ball
                  </span>
                </span>
              </motion.button>

              <div className="h-8 w-px bg-border mx-4" />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      onClick={() => router.push("/")}
                      className={isHomePage ? "bg-accent text-accent-foreground" : ""}
                      size="sm"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Home
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View your characters</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      onClick={() => router.push("/campaigns")}
                      className={isCampaignsPage ? "bg-accent text-accent-foreground" : ""}
                      size="sm"
                    >
                      <Compass className="w-4 h-4 mr-2" />
                      Campaigns
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Manage your campaigns</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {user && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="ghost"
                          onClick={() => router.push("/documents")}
                          className={
                            pathname === "/documents" ? "bg-accent text-accent-foreground" : ""
                          }
                          size="sm"
                        >
                          <Book className="w-4 h-4 mr-2" />
                          Documents
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isAdmin ? "Manage documents" : "View documents"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {isAdmin && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            variant="ghost"
                            onClick={() => router.push("/admin")}
                            className={
                              pathname === "/admin" ? "bg-accent text-accent-foreground" : ""
                            }
                            size="sm"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Admin
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Manage users and campaigns</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
            </motion.div>

            {/* Mobile Logo */}
            <motion.div
              className="flex lg:hidden items-center"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                whileTap={{ scale: 0.95 }}
              >
                {/* <IconOne className="h-10 w-10" /> */}
                <span className="block text-black dark:text-white font-bold text-lg">
                  Merlin&apos;s Crystal Ball
                </span>
              </motion.button>
            </motion.div>

            {/* Desktop Right Side */}
            <motion.div
              className="hidden lg:flex items-center space-x-2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.name || user?.email || "Loading..."}
              </span>
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={user?.image || undefined}
                  alt={user?.name || user?.email || "User"}
                />
                <AvatarFallback className="text-xs font-semibold">
                  {(user?.name || user?.email || "U")
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="outline" onClick={() => router.push("/settings")} size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Account settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <ThemeToggle />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="outline" onClick={handleLogout} size="sm">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>

            {/* Mobile Menu Button */}
            <motion.div
              className="flex lg:hidden items-center"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="lg:hidden fixed inset-0 bg-black/20 z-40"
                onClick={() => setMobileMenuOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />

              <motion.div
                ref={mobileMenuRef}
                className="lg:hidden border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 relative z-50"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-4 py-6 space-y-6">
                  {/* User Profile Section */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={user?.image || undefined}
                        alt={user?.name || user?.email || "User"}
                      />
                      <AvatarFallback className="text-sm font-semibold">
                        {(user?.name || user?.email || "U")
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                    </div>
                  </div>

                  {/* Main Navigation */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Navigation
                    </p>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start h-12 ${
                        isHomePage ? "bg-accent text-accent-foreground" : ""
                      }`}
                      onClick={() => {
                        router.push("/");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Home className="w-5 h-5 mr-3" />
                      <span className="font-medium">Home</span>
                    </Button>

                    <Button
                      variant="ghost"
                      className={`w-full justify-start h-12 ${
                        isCampaignsPage ? "bg-accent text-accent-foreground" : ""
                      }`}
                      onClick={() => {
                        router.push("/campaigns");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Compass className="w-5 h-5 mr-3" />
                      <span className="font-medium">Campaigns</span>
                    </Button>

                    {user && (
                      <Button
                        variant="ghost"
                        className={`w-full justify-start h-12 ${
                          pathname === "/documents" ? "bg-accent text-accent-foreground" : ""
                        }`}
                        onClick={() => {
                          router.push("/documents");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Book className="w-5 h-5 mr-3" />
                        <span className="font-medium">Documents</span>
                      </Button>
                    )}

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        className={`w-full justify-start h-12 ${
                          pathname === "/admin" ? "bg-accent text-accent-foreground" : ""
                        }`}
                        onClick={() => {
                          router.push("/admin");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Shield className="w-5 h-5 mr-3" />
                        <span className="font-medium">Admin Panel</span>
                      </Button>
                    )}
                  </div>

                  {/* Settings & Actions */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Settings
                    </p>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start h-12 ${
                        pathname === "/settings" ? "bg-accent text-accent-foreground" : ""
                      }`}
                      onClick={() => {
                        router.push("/settings");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Settings className="w-5 h-5 mr-3" />
                      <span className="font-medium">Account Settings</span>
                    </Button>

                    <div className="flex items-center justify-between px-3 py-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                      <div className="flex items-center">
                        <div className="w-5 h-5 mr-3" /> {/* Icon spacer */}
                        <span className="font-medium">Theme</span>
                      </div>
                      <ThemeToggle />
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      <span className="font-medium">Sign Out</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>
    </motion.div>
  );
}
