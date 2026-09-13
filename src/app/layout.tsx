import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The font variables must live on <html>: globals.css applies font-sans
  // there, and a variable defined only on <body> would not resolve for it.
  // The `dark` class is NOT set here — the script below sets it before first
  // paint, which is the only way to avoid a light flash on a dark-first page.
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/*
          Dark is the designed default, so an unset preference is seeded to
          dark rather than left empty. Seeding (instead of only adding the
          class) keeps localStorage in sync with what is rendered — the theme
          hook reads the same key, and would otherwise think the page is light
          and no-op on the first click.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!localStorage.theme)localStorage.theme='dark';if(localStorage.theme==='dark')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}",
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
