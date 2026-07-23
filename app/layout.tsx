import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CICAPORA Sport Climbing",
  description: "Monitoring Performa Atlet Sport Climbing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        background: '#0a1428',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        {children}
      </body>
    </html>
  );
}