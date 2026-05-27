import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Outfit, Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistHeading = Geist({subsets:['latin'],variable:'--font-heading'});

const outfit = Outfit({subsets:['latin'],variable:'--font-sans'});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BLU UIN Palopo — Penerimaan Dana",
  description: "Aplikasi pengelolaan penerimaan dana BLU UIN Palopo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistMono.variable, "font-sans", outfit.variable, geistHeading.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
