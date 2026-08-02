import type { Metadata } from "next";
import { Raleway, Inter, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const raleway = Raleway({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-raleway",
});

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-be-vietnam",
});

export const metadata: Metadata = {
  title: "LMS FPT School Cần Thơ | Hệ thống Tự học Khối 12",
  description: "Nền tảng học tập trực tuyến hiện đại, trực quan dành riêng cho học sinh Khối 12 tự học tại THPT FPT Cần Thơ. Phát triển bởi Trần Ngọc Minh Thông.",
  keywords: "LMS, FPT School Cần Thơ, Khối 12, Tự học, THPT FPT",
  authors: [{ name: "Trần Ngọc Minh Thông" }],
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
      className={`${raleway.variable} ${inter.variable} ${beVietnam.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
