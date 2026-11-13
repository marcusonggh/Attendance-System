import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { OnlineStatusProvider } from "@/components/ui/OnlineStatusProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Class Tracker",
  description: "Attendance and fee tracking for tutoring classes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body
        className="relative flex min-h-full flex-col bg-zinc-50 text-zinc-900"
        suppressHydrationWarning
      >
        <OnlineStatusProvider>
          <ToastProvider>{children}</ToastProvider>
        </OnlineStatusProvider>
      </body>
    </html>
  );
}
