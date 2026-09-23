import type { Metadata } from "next";
import { Raleway, Inter, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Suspense } from "react";
import RouteProgressBar from "@/components/RouteProgressBar";

const raleway = Raleway({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-raleway",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LMS FPT School Cần Thơ | Hệ thống Tự học Khối 12",
  description: "Nền tảng học tập trực tuyến hiện đại, trực quan dành riêng cho học sinh Khối 12 tự học tại THPT FPT Cần Thơ. Một sản phẩm của Tổ Tự Nhiên - Trường THPT FPT Cần Thơ.",
  keywords: "LMS, FPT School Cần Thơ, Khối 12, Tự học, THPT FPT, Tổ Tự Nhiên",
  authors: [{ name: "Tổ Tự Nhiên - Trường THPT FPT Cần Thơ" }, { name: "Trần Ngọc Minh Thông" }],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${raleway.variable} ${inter.variable} ${beVietnam.variable} min-h-screen antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground" suppressHydrationWarning>
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
