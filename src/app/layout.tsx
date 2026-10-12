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
        className="relative flex min-h-full flex-col text-zinc-900"
        suppressHydrationWarning
      >
        <div className="fixed inset-0 -z-20 bg-gradient-to-br from-teal-100 via-cyan-50 to-emerald-100" />
        <div className="fixed -top-32 -right-24 -z-10 h-96 w-96 rounded-full bg-teal-300/50 blur-3xl" />
        <div className="fixed top-1/3 -left-32 -z-10 h-96 w-96 rounded-full bg-cyan-300/40 blur-3xl" />
        <div className="fixed -bottom-32 right-1/4 -z-10 h-96 w-96 rounded-full bg-emerald-300/40 blur-3xl" />
        <OnlineStatusProvider>
          <ToastProvider>{children}</ToastProvider>
        </OnlineStatusProvider>
      </body>
    </html>
  );
}
