import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: {
        default: "KPILOTE",
        template: "%s — KPILOTE",
    },
    description: "Tableau de bord performance pour boutiques télécom",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "KPILOTE",
    },
    icons: {
        icon: [
            { url: "/icon.svg", type: "image/svg+xml" },
            { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [
            { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
    },
    other: {
        "mobile-web-app-capable": "yes",
    },
};

export const viewport: Viewport = {
    themeColor: "#7c3aed",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    // iPad mini : autorise portrait ET landscape
    interactiveWidget: "resizes-visual",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr" className={`${inter.variable} h-full antialiased`}>
            <head>
                {/* iOS Safari PWA */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="KPILOTE" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

                {/* Splash screens iOS (optionnel mais améliore le démarrage) */}
                <meta name="apple-touch-fullscreen" content="yes" />
            </head>
            <body className="min-h-full min-h-[100dvh]">
                <ServiceWorkerRegistrar />
                {children}
            </body>
        </html>
    );
}
