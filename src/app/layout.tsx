import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import UmamiAnalytics from "@/components/umami-analytics";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Merlins Crystal Ball",
  description: "Merlins Crystal Ball - Table Top RPG Campaign Manager",
  keywords: ["Merlins Crystal Ball"],
  authors: [{ name: "Merlins Crystal Ball", url: "https://merlinscrystalball.romitsagu.com" }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <UmamiAnalytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getTheme() {
                  const cookies = document.cookie.split('; ');
                  const themeCookie = cookies.find(row => row.startsWith('merlins-crystal-ball-theme='));
                  const savedTheme = themeCookie?.split('=')[1];
                  
                  if (savedTheme === 'dark') {
                    return 'dark';
                  }
                  
                  if (savedTheme === 'light') {
                    return 'light';
                  }
                  
                  if (savedTheme === 'system' || !savedTheme) {
                    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  
                  return 'light';
                }
                
                const theme = getTheme();
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
