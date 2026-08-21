import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LogoProvider } from "@/components/LogoProvider";
import { WebsiteSettingsProvider } from "@/components/WebsiteSettingsProvider";
import { AuthProvider } from "@/lib/auth-context";
import HideOnAdmin from "@/components/admin/HideOnAdmin";
import { getActiveLogo } from "@/lib/logo-store";
import { getWebsiteSettingsWithFallback } from "@/lib/website-settings";
import { fetchNavbarConfig } from "@/lib/navbar";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MediSpark — HSC Academic & Medical Admission Preparation",
    template: "%s | MediSpark",
  },
  description:
    "MediSpark is an HSC academic and medical admission preparation platform — courses, exams, and Q&A built for future medical students.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [initialLogo, initialSettings, navbarConfig] = await Promise.all([
    getActiveLogo(),
    getWebsiteSettingsWithFallback(),
    fetchNavbarConfig(),
  ]);
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("medispark-theme");document.documentElement.setAttribute("data-theme",(t==="light"||t==="dark")?t:"dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`,
          }}
        />
        {initialSettings.faviconUrl && (
          <link rel="icon" href={initialSettings.faviconUrl} />
        )}
      </head>
      <body className="flex min-h-full flex-col bg-dark-950 pb-16 text-neutral-300">
        <ThemeProvider>
          <WebsiteSettingsProvider initialSettings={initialSettings}>
            <LogoProvider initialLogo={initialLogo}>
              <AuthProvider>
                <HideOnAdmin>
                  <Navbar config={navbarConfig} />
                </HideOnAdmin>
                {children}
                <HideOnAdmin>
                  <Footer />
                  <BottomNav />
                </HideOnAdmin>
              </AuthProvider>
            </LogoProvider>
          </WebsiteSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}