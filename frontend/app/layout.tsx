import type { Metadata } from "next";
import { Source_Code_Pro, Vazirmatn } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

const appSans = Vazirmatn({
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
});

const appMono = Source_Code_Pro({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

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
      <body className={`${appSans.variable} ${appMono.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
