"use client";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Home,
  Compass,
  Settings,
  LogOut,
  Shield,
  Book,
  ChevronDown,
  Printer,
  Wand2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "@/lib/auth-client";

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

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

  const desktopNavLinkClass = (active: boolean) =>
    buttonVariants({
      variant: "ghost",
      size: "sm",
      className: active ? "bg-accent text-accent-foreground" : "",
    });

  const mobileNavLinkClass = (active: boolean) =>
    buttonVariants({
      variant: "ghost",
      className: `w-full justify-start h-12 ${active ? "bg-accent text-accent-foreground" : ""}`,
    });

  const iconLinkClass = buttonVariants({ variant: "outline", size: "icon-sm" });

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };
  return (
    <motion.div
      className="bg-background"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Desktop Navigation */}
            <motion.div
              className="hidden lg:flex items-center gap-2"
              initial={prefersReducedMotion ? false : { x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.1 }}
            >
              <Link
                href="/"
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
                aria-label="Merlin's Crystal Ball home"
              >
                <span className="hidden sm:block">
                  <span className="block text-black dark:text-white font-bold text-xl">
                    Merlin&apos;s Crystal Ball
                  </span>
                </span>
              </Link>

              <div className="h-8 w-px bg-border mx-4" />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Link
                      href="/"
                      aria-current={isHomePage ? "page" : undefined}
                      className={desktopNavLinkClass(isHomePage)}
                    >
                      <Home className="w-4 h-4 mr-2" aria-hidden="true" />
                      Home
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>View your characters</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Link
                      href="/campaigns"
                      aria-current={isCampaignsPage ? "page" : undefined}
                      className={desktopNavLinkClass(isCampaignsPage)}
                    >
                      <Compass className="w-4 h-4 mr-2" aria-hidden="true" />
                      Campaigns
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Manage your campaigns</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {user && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Link
                          href="/documents"
                          aria-current={pathname === "/documents" ? "page" : undefined}
                          className={desktopNavLinkClass(pathname === "/documents")}
                        >
                          <Book className="w-4 h-4 mr-2" aria-hidden="true" />
                          Documents
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isAdmin ? "Manage documents" : "View documents"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button
                              variant="ghost"
                              className={
                                pathname?.startsWith("/printables")
                                  ? "bg-accent text-accent-foreground"
                                  : ""
                              }
                              size="sm"
                            >
                              <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
                              Printables
                              <ChevronDown className="w-4 h-4 ml-1" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => router.push("/printables/spells")}
                            >
                              <Wand2 className="w-4 h-4 mr-2" aria-hidden="true" />
                              Spells
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TooltipTrigger>
                      <TooltipContent>View printable sheets</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {isAdmin && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Link
                            href="/admin"
                            aria-current={pathname === "/admin" ? "page" : undefined}
                            className={desktopNavLinkClass(pathname === "/admin")}
                          >
                            <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                            Admin
                          </Link>
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
              initial={prefersReducedMotion ? false : { x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.1 }}
            >
              <Link
                href="/"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
                aria-label="Merlin's Crystal Ball home"
              >
                <span className="block text-black dark:text-white font-bold text-lg">
                  Merlin&apos;s Crystal Ball
                </span>
              </Link>
            </motion.div>

            {/* Desktop Right Side */}
            <motion.div
              className="hidden lg:flex items-center space-x-2"
              initial={prefersReducedMotion ? false : { x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.1 }}
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
                    <Link href="/settings" aria-label="Account settings" className={iconLinkClass}>
                      <Settings className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Account settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <ThemeToggle />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="outline"
                      onClick={handleLogout}
                      size="sm"
                      aria-label="Sign out"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>

            {/* Mobile Menu Button */}
            <motion.div
              className="flex lg:hidden items-center"
              initial={prefersReducedMotion ? false : { x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.1 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation-menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
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
                id="mobile-navigation-menu"
                className="lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 relative z-50"
                initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
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
                    <Link
                      href="/"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isHomePage ? "page" : undefined}
                      className={mobileNavLinkClass(isHomePage)}
                    >
                      <Home className="w-5 h-5 mr-3" aria-hidden="true" />
                      <span className="font-medium">Home</span>
                    </Link>

                    <Link
                      href="/campaigns"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isCampaignsPage ? "page" : undefined}
                      className={mobileNavLinkClass(isCampaignsPage)}
                    >
                      <Compass className="w-5 h-5 mr-3" aria-hidden="true" />
                      <span className="font-medium">Campaigns</span>
                    </Link>

                    {user && (
                      <>
                        <Link
                          href="/documents"
                          onClick={() => setMobileMenuOpen(false)}
                          aria-current={pathname === "/documents" ? "page" : undefined}
                          className={mobileNavLinkClass(pathname === "/documents")}
                        >
                          <Book className="w-5 h-5 mr-3" aria-hidden="true" />
                          <span className="font-medium">Documents</span>
                        </Link>
                        <Link
                          href="/printables/spells"
                          onClick={() => setMobileMenuOpen(false)}
                          aria-current={pathname?.startsWith("/printables") ? "page" : undefined}
                          className={mobileNavLinkClass(
                            pathname?.startsWith("/printables") || false,
                          )}
                        >
                          <Printer className="w-5 h-5 mr-3" aria-hidden="true" />
                          <span className="font-medium">Printables</span>
                        </Link>
                        <Link
                          href="/printables/spells"
                          onClick={() => setMobileMenuOpen(false)}
                          aria-current={
                            pathname?.startsWith("/printables/spells") ? "page" : undefined
                          }
                          className={`${mobileNavLinkClass(pathname?.startsWith("/printables/spells") || false)} ml-6`}
                        >
                          <span className="font-medium text-sm">Spells</span>
                        </Link>
                      </>
                    )}

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={pathname === "/admin" ? "page" : undefined}
                        className={mobileNavLinkClass(pathname === "/admin")}
                      >
                        <Shield className="w-5 h-5 mr-3" aria-hidden="true" />
                        <span className="font-medium">Admin Panel</span>
                      </Link>
                    )}
                  </div>

                  {/* Settings & Actions */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Settings
                    </p>
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={pathname === "/settings" ? "page" : undefined}
                      className={mobileNavLinkClass(pathname === "/settings")}
                    >
                      <Settings className="w-5 h-5 mr-3" aria-hidden="true" />
                      <span className="font-medium">Account Settings</span>
                    </Link>

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
                      <LogOut className="w-5 h-5 mr-3" aria-hidden="true" />
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
