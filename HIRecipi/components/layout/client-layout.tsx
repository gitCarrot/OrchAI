'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from "../ui/toaster";
import { Sidebar } from "./sidebar";
import { Providers } from '../../app/providers';
import { ChatBox } from '../chat/chat-box';
import { ThemeProvider } from '../theme-provider';
import { NavigationProvider } from '../navigation-provider';
import { useNavigationStore } from '@/store/navigation';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const { isSidebarOpen } = useNavigationStore();

  // 페이지 변경 시 스크롤을 맨 위로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NavigationProvider>
        <Providers>
          <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className={`flex-1 transition-all duration-200 ease-in-out ${isSidebarOpen ? 'md:ml-[280px]' : 'md:ml-[72px]'}`}>
              <div className="container mx-auto px-4 py-8">
                {children}
              </div>
            </main>
          </div>
          <Toaster />
          <ChatBox />
        </Providers>
      </NavigationProvider>
    </ThemeProvider>
  );
} 