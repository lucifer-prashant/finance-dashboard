import type { Metadata, Viewport } from "next";
import "./globals.css";

// 1. Force the mobile browser to treat this like a native app
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // 'cover' allows content to go under the notch/status bar for that "native" feel
  viewportFit: "cover", 
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  title: "Finance Tracker Pro",
  description: "Track and analyze your finances",
  manifest: "/manifest.json",
  
  // 2. Apple-specific settings (Critical for iOS)
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Makes status bar transparent overlay
    title: "Finance",
  },
  
  // 3. Standard icons
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950">
        {children}
      </body>
    </html>
  );
}