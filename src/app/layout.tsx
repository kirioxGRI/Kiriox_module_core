import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/core/layout";
import AppShell from "@/core/dashboard-shell/AppShell";
import QueryProvider from "@/shared/providers/QueryProvider";
import { APP_SHORT_NAME, APP_NAME, APP_DESCRIPTION } from "@/config/app";
import { getServerAccessContext } from "@/core/permissions/server/getServerAccessContext";
import { bootstrapCore } from "@/core/core-bootstrap";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${APP_SHORT_NAME} — ${APP_NAME}`,
  description: APP_DESCRIPTION,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

bootstrapCore();

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch access context on the server so the sidebar renders immediately.
  // React.cache() ensures this is shared with requirePageAccess calls in the
  // same request — zero extra DB queries.
  let initialAccess = null;
  try {
    initialAccess = await getServerAccessContext();
  } catch (err) {
    // Non-fatal: unauthenticated users or DB errors — AppShell handles via client fallback.
    // Log so infra can detect connectivity issues early.
    console.error('[layout] getServerAccessContext failed:', err instanceof Error ? err.message : err);
  }

  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <AppShell initialAccess={initialAccess}>{children}</AppShell>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
