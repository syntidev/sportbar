import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { CourtBackground } from "@/components/ui/CourtBackground";
import "./globals.css";
import "../styles/tokens.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "SportBar · Sport Bar",
  description: "Sistema operativo para Sport Bar · Guaiqueríes de Margarita",
  icons: {
    icon: "/logo-color.png",
    shortcut: "/logo-color.png",
    apple: "/logo-color.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${sora.variable}`}>
        <CourtBackground />
        {children}
      </body>
    </html>
  );
}
