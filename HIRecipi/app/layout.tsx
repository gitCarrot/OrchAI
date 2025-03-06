import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ClientLayout } from "../components/layout/client-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HIRecipi - 냉장고 재료로 만드는 레시피",
  description: "냉장고 속 재료로 만들 수 있는 레시피를 찾아보세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="ko" suppressHydrationWarning>
        <body className={inter.className} suppressHydrationWarning>
          <ClientLayout>{children}</ClientLayout>
        </body>
      </html>
    </ClerkProvider>
  );
} 