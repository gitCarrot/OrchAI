'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigationStore } from '@/store/navigation';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserButton } from '@clerk/nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChefHat, 
  Refrigerator, 
  Home,
  Share2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Mail,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { isSidebarOpen, setIsSidebarOpen } = useNavigationStore();
  const { t, setLanguage, language } = useTranslations();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 모바일 여부 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsSidebarOpen]);

  const menuItems = [
    { href: '/', icon: Home, label: t('common.home') },
    { href: '/refrigerators', icon: Refrigerator, label: t('common.refrigerator') },
    { href: '/recipes', icon: ChefHat, label: t('common.recipe') },
    { href: '/recipes/shared', icon: Share2, label: t('common.sharedRecipe') },
    { href: '/refrigerators/invitations', icon: Mail, label: t('common.invitation') },
  ];

  const LanguageSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-2"
        >
          <span className="text-base">
            {language === 'ko' ? '🇰🇷' : language === 'en' ? '🇺🇸' : '🇯🇵'}
          </span>
          <span className="hidden md:inline-block text-sm font-medium">
            {language === 'ko' ? '한국어' : language === 'en' ? 'English' : '日本語'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage('ko')}>
          <span className="text-base mr-2">🇰🇷</span>
          한국어
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('en')}>
          <span className="text-base mr-2">🇺🇸</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('ja')}>
          <span className="text-base mr-2">🇯🇵</span>
          日本語
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // 컴포넌트가 마운트되기 전에는 아무것도 렌더링하지 않음
  if (!isMounted) {
    return null;
  }

  // 모바일 메뉴
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 20 }}
                className="fixed top-0 left-0 h-full w-[280px] bg-card border-r z-50"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b">
                    <Link href="/" className="flex items-center gap-2">
                      <ChefHat className="w-6 h-6 text-primary" />
                      <span className="font-bold text-lg">HIRecipi</span>
                    </Link>
                    <div className="flex items-center gap-2">
                      <LanguageSelector />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center px-4 py-3 border-b">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                  <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => {
                      const isActive = pathname === item.href || 
                        (item.href !== '/' && pathname.startsWith(item.href) && (
                          (item.href === '/recipes' && !pathname.startsWith('/recipes/shared')) ||
                          (item.href === '/refrigerators' && !pathname.startsWith('/refrigerators/invitations')) ||
                          (item.href === '/recipes/shared' && pathname === '/recipes/shared') ||
                          (item.href === '/refrigerators/invitations' && pathname === '/refrigerators/invitations')
                        ));
                      return (
                        <Link key={item.href} href={item.href}>
                          <span className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                            "hover:bg-muted/50",
                            isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                          )}>
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // 데스크톱 메뉴
  return (
    <motion.div
      initial={false}
      animate={{
        width: isSidebarOpen ? 280 : 72,
        transition: { duration: 0.2, ease: "easeInOut" }
      }}
      className={cn(
        "fixed top-0 left-0 h-full bg-card border-r z-40",
        "flex flex-col",
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <ChefHat className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">HIRecipi</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hover:bg-muted"
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center px-4 py-3 border-b">
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-9 h-9"
            }
          }}
        />
      </div>

      <nav className="flex-1 p-2 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href) && (
              (item.href === '/recipes' && !pathname.startsWith('/recipes/shared')) ||
              (item.href === '/refrigerators' && !pathname.startsWith('/refrigerators/invitations')) ||
              (item.href === '/recipes/shared' && pathname === '/recipes/shared') ||
              (item.href === '/refrigerators/invitations' && pathname === '/refrigerators/invitations')
            ));
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors relative",
                  "hover:bg-muted/50 group",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon className="w-5 h-5 min-w-[20px]" />
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.span
                      className="font-medium whitespace-nowrap"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!isSidebarOpen && isActive && (
                  <motion.div
                    className="absolute left-0 w-1 h-full bg-primary rounded-full"
                    layoutId="activeIndicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </motion.div>
  );
} 