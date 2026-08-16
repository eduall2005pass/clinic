import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LogoProvider } from "@/components/LogoProvider";
import { getActiveLogo } from "@/lib/logo-store";
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
  title: {
    default: "MediSpark — HSC Academic & Medical Admission Preparation",
    template: "%s | MediSpark",
  },
  description:
    "MediSpark is an HSC academic and medical admission preparation platform — courses, exams, and Q&A built for future medical students.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const initialLogo = await getActiveLogo();
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
      </head>
      <body className="flex min-h-full flex-col bg-dark-950 pb-16 text-neutral-300">
        <ThemeProvider>
          <LogoProvider initialLogo={initialLogo}>
            <Navbar />
            {children}
            <Footer />
            <BottomNav />
          </LogoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}