'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { Bell } from 'lucide-react'
import { LanguageSelector } from '@/components/language/language-selector'
import { useTranslations } from '@/hooks/use-translations'

const navigation = [
  { name: 'common.home', href: '/' },
  { name: 'common.refrigerator', href: '/refrigerators' },
  { name: 'common.recipe', href: '/recipes' },
  { name: 'common.sharedRecipe', href: '/recipes/shared' },
]

export function Header() {
  const pathname = usePathname()
  const { t } = useTranslations()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">HIRecipi</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname === item.href ? 'text-foreground' : 'text-foreground/60'
                )}
              >
                {t(item.name)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <LanguageSelector />
          <Link
            href="/refrigerators/invitations"
            className={cn(
              'flex items-center space-x-1 transition-colors hover:text-foreground/80',
              pathname === '/refrigerators/invitations' ? 'text-foreground' : 'text-foreground/60'
            )}
          >
            <Bell className="h-5 w-5" />
            <span className="text-sm">{t('common.invitation')}</span>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  )
} 