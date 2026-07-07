import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Kommo Dashboard",
  description: "Métricas e widgets integrados ao Kommo CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-dvh font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
