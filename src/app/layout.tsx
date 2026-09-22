import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { RoleProvider } from "./_lib/RoleProvider";
import { EffectiveConfigProvider } from "./_lib/EffectiveConfigProvider";
import { DemoHeader } from "@/components/demo-header";
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
  title: "CaseDeck",
  description:
    "Budget a project, see confidence-weighted best/expected/worst scenarios, and track budget vs. actuals as the project runs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RoleProvider>
          <EffectiveConfigProvider>
            <header className="border-b">
              <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
                <div className="flex items-center gap-4">
                  <Link href="/" className="text-lg font-semibold tracking-tight">
                    CaseDeck
                  </Link>
                  <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
                    Settings
                  </Link>
                </div>
                <DemoHeader />
              </div>
            </header>
            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
              {children}
            </main>
          </EffectiveConfigProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
