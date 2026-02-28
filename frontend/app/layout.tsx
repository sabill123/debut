import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Debut — Virtual Idol Debut Simulator",
  description: "Create your own virtual idol and debut them in minutes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
