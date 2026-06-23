import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import Script from "next/script";

export const metadata: Metadata = {
    title: "Izh",
    description:
        "Izh is a compact chart description language for deterministic SVG output, with arrays, null handling, and color palettes.",
    icons: {
        icon: [
            {
                url: "/favicon-light.svg",
                media: "(prefers-color-scheme: light)",
            },
            { url: "/favicon-dark.svg", media: "(prefers-color-scheme: dark)" },
        ],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <Script id="theme-init" strategy="beforeInteractive">
                    {`(function(){try{var key='theme';var stored=localStorage.getItem(key);var preferDark=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=stored|| (preferDark? 'dark':'light');if(theme==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')} }catch(e){} })()`}
                </Script>
            </head>
            <body className="bg-bg-main text-text-primary min-h-screen flex flex-col">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                >
                    <Navbar />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
