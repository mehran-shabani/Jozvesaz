import type { Metadata } from "next";
import localFont from "next/font/local";
import { Source_Code_Pro, Vazirmatn } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

const fallbackSans = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-sans",
});

const fallbackMono = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-mono",
});

let geistSans = fallbackSans;
try {
  geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-sans",
    weight: "100 900",
  });
} catch (error) {
  if (process.env.NODE_ENV === "development") {
    console.warn("Geist Sans font not found. Run `npm run setup:fonts` to download it.", error);
  }
}

let geistMono = fallbackMono;
try {
  geistMono = localFont({
    src: "./fonts/GeistMonoVF.woff",
    variable: "--font-mono",
    weight: "100 900",
  });
} catch (error) {
  if (process.env.NODE_ENV === "development") {
    console.warn("Geist Mono font not found. Run `npm run setup:fonts` to download it.", error);
  }
}

export const metadata: Metadata = {
  title: "Task Manager Dashboard",
  description: "Frontend for the FastAPI task manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
