"use client";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Menu, X, Home, Compass, Settings, LogOut, Shield } from "lucide-react";
import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHomePage = pathname === "/";
  const isCampaignsPage = pathname?.startsWith("/campaigns");

  if (isPending) {
    return <div className="h-16 bg-card border-b border-border" />;
  }

  if (!session) {
    return null;
  }

  const user = session.user;

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

              {user && "isAdmin" in user && (user as unknown as { isAdmin: boolean }).isAdmin && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        onClick={() => router.push("/admin")}
                        className={pathname === "/admin" ? "bg-accent text-accent-foreground" : ""}
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
                {user.name || user.email}
              </span>
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                <AvatarFallback className="text-xs font-semibold">
                  {(user.name || user.email)
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
        {mobileMenuOpen && (
          <motion.div
            className="lg:hidden border-t border-border"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-4 space-y-3">
              {/* Other Navigation */}
              <div className="pt-2 border-t border-border space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push("/");
                    setMobileMenuOpen(false);
                  }}
                >
                  Home
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push("/campaigns");
                    setMobileMenuOpen(false);
                  }}
                >
                  Campaigns
                </Button>
              </div>

              {/* User Section */}
              <div className="pt-4 border-t border-border space-y-2">
                <div className="px-2 text-sm text-gray-600 dark:text-gray-400">
                  {user.name || user.email}
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push("/settings");
                    setMobileMenuOpen(false);
                  }}
                >
                  Settings
                </Button>
                {user && "isAdmin" in user && (user as unknown as { isAdmin: boolean }).isAdmin && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      router.push("/admin");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Admin Panel
                  </Button>
                )}
                <div className="flex items-center justify-between h-10 px-4 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                  <span className="text-sm font-medium">Theme</span>
                  <ThemeToggle />
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </nav>
    </motion.div>
  );
}
