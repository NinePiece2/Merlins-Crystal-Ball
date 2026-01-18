"use client";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboardPage = pathname?.startsWith("/dashboard") || pathname === "/";
  const isPrintingPage = pathname?.startsWith("/printing");
  const isDeliveryPage = pathname?.startsWith("/delivery");

  // Check specific dashboard pages
  const isMainDashboard = pathname === "/dashboard" || pathname === "/";
  const isSalesDashboard = pathname === "/dashboard/sales";
  const isInspectionDashboard = pathname === "/dashboard/inspection";
  const isFinanceDashboard = pathname === "/dashboard/finance";

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
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* <IconOne className="h-12 w-12" /> */}

                <span className="hidden sm:block">
                  <span className="block text-black dark:text-white font-bold text-xl">
                    Merlin's Crystal Ball
                  </span>
                </span>
              </motion.button>

              <div className="h-8 w-px bg-border mx-4" />

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    variant="ghost"
                    className={`flex items-center gap-1 ${isDashboardPage ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    Dashboards
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="pt-1 pb-1">
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard")}
                    className={`cursor-pointer ${isMainDashboard ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    Dashboard
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                onClick={() => router.push("/printing")}
                className={isPrintingPage ? "bg-accent text-accent-foreground" : ""}
              >
                Printing
              </Button>

              <Button
                variant="ghost"
                onClick={() => router.push("/delivery")}
                className={isDeliveryPage ? "bg-accent text-accent-foreground" : ""}
              >
                Shipping & Delivery
              </Button>
            </motion.div>

            {/* Mobile Logo */}
            <motion.div
              className="flex lg:hidden items-center"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                whileTap={{ scale: 0.95 }}
              >
                {/* <IconOne className="h-10 w-10" /> */}
                <span className="block text-black dark:text-white font-bold text-lg">
                  Print Ops
                </span>
              </motion.button>
            </motion.div>

            {/* Desktop Right Side */}
            <motion.div
              className="hidden lg:flex items-center space-x-4"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.name || user.email}
              </span>
              <Button variant="outline" onClick={() => router.push("/settings")}>
                Settings
              </Button>
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
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
              {/* Dashboards Section */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
                  Dashboards
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push("/dashboard");
                    setMobileMenuOpen(false);
                  }}
                >
                  Dashboard
                </Button>
              </div>

              {/* Other Navigation */}
              <div className="pt-2 border-t border-border space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push("/printing");
                    setMobileMenuOpen(false);
                  }}
                >
                  Printing
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    router.push("/delivery");
                    setMobileMenuOpen(false);
                  }}
                >
                  Delivery
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
