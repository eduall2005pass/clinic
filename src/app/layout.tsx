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
import AnnouncementBar from "@/components/home/AnnouncementBar";
import { getActiveLogo } from "@/lib/logo-store";
import { getWebsiteSettingsWithFallback } from "@/lib/website-settings";
import { fetchSeoSettings } from "@/lib/seo-settings";
import { fetchNavbarConfig } from "@/lib/navbar";
import {
  fetchThemeSettings,
  buildThemeOverrideCss,
} from "@/lib/theme-settings";
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

const DEFAULT_SITE_TITLE =
  "MediSpark — HSC Academic & Medical Admission Preparation";
const DEFAULT_META_DESCRIPTION =
  "MediSpark is an HSC academic and medical admission preparation platform — courses, exams, and Q&A built for future medical students.";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchSeoSettings();
  const siteTitle = seo.siteTitle || DEFAULT_SITE_TITLE;
  const description = seo.metaDescription || DEFAULT_META_DESCRIPTION;
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.VERCEL_URL ??
        "https://bloodarenabd.tech",
    ),
    title: {
      default: siteTitle,
      template: `%s | ${seo.siteTitle || "MediSpark"}`,
    },
    description,
    keywords: seo.keywords
      ? seo.keywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : undefined,
    openGraph: {
      title: seo.ogTitle || siteTitle,
      description: seo.ogDescription || description,
      images: seo.ogImageUrl ? [seo.ogImageUrl] : undefined,
      type: "website",
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [initialLogo, initialSettings, navbarConfig, themeSettings] =
    await Promise.all([
      getActiveLogo(),
      getWebsiteSettingsWithFallback(),
      fetchNavbarConfig(),
      fetchThemeSettings(),
    ]);
  const themeOverrideCss = buildThemeOverrideCss(themeSettings);
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-button-style={themeSettings.buttonStyle}
      data-radius={themeSettings.borderRadius}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("medispark-theme");if(t!=="light"&&t!=="dark"){t="${themeSettings.themeMode}";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","${themeSettings.themeMode}");}})();`,
          }}
        />
        {themeOverrideCss && (
          <style dangerouslySetInnerHTML={{ __html: themeOverrideCss }} />
        )}
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
                  <AnnouncementBar />
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