'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigationStore } from '../store/navigation';

interface NavigationProviderProps {
  children: React.ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const pathname = usePathname();
  const { setPage } = useNavigationStore();

  useEffect(() => {
    // 현재 경로에 따라 페이지 상태 업데이트
    if (pathname === '/') {
      setPage('home');
    } else if (pathname.startsWith('/recipes')) {
      setPage('recipes');
    } else if (pathname.startsWith('/refrigerators')) {
      setPage('refrigerators');
    }
  }, [pathname, setPage]);

  return <>{children}</>;
} 