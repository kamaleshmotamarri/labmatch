import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { StoreProvider } from "@/components/store";

const geistSans = localFont({
  src: "./fonts/geist.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Labmatch — Find your people. Discover your research.",
  description: "A little curiosity. A world of possibility. Explore research, discover labs, and practice your first hello with Labmatch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#742d40",
              colorBackground: "#fffefb",
              colorForeground: "#302d29",
              borderRadius: "0.45rem",
              fontFamily: "var(--font-geist-sans), Arial, sans-serif",
            },
          }}
        >
          <StoreProvider>{children}</StoreProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}