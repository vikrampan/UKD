import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "उत्तराखंड क्रांति दल — संगठन पोर्टल",
  description: "दल का आंतरिक संगठन एवं संचालन पोर्टल।",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hind:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
