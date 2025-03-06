'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Share2Icon, UserIcon, Lock, Users2, Trash2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/hooks/use-translations'

interface Refrigerator {
  id: number
  name: string
  description: string | null
  ownerId: string
  isOwner: boolean
  role: 'owner' | 'admin' | 'viewer'
  memberCount: number
  ingredientCount: number
}

interface Props {
  refrigerators: Refrigerator[]
  onDelete?: (id: number, e: React.MouseEvent) => Promise<void>
}

// 개별 냉장고 카드 컴포넌트
const RefrigeratorCard = ({ 
  refrigerator,
  onDelete
}: { 
  refrigerator: Refrigerator;
  onDelete?: (id: number, e: React.MouseEvent) => Promise<void>;
}) => {
  const getRoleIcon = (role: string, isShared: boolean) => {
    if (role === 'owner') {
      return (
        <div className="flex items-center gap-1 text-primary">
          <UserIcon className="w-4 h-4" />
          <span className="text-xs">Owner</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Share2Icon className="w-4 h-4" />
        <span className="text-xs">Shared</span>
      </div>
    )
  }

  return (
    <Link
      href={`/refrigerators/${refrigerator.id}`}
      className="block p-6 rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="line-clamp-2">{refrigerator.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={refrigerator.role === 'owner' ? 'default' : 'secondary'}>
                {refrigerator.role === 'owner' ? '소유자' : '공유됨'}
              </Badge>
            </div>
          </div>
          {refrigerator.isOwner && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => onDelete(refrigerator.id, e)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>
    </Link>
  )
}

RefrigeratorCard.displayName = 'RefrigeratorCard'

// 로딩 스켈레톤 컴포넌트
const LoadingSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="p-6">
        <div className="flex justify-between items-start mb-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-4 w-24" />
      </Card>
    ))}
  </div>
)

// 에러 컴포넌트
const ErrorMessage = () => (
  <Card className="p-6">
    <CardContent className="text-center py-4">
      <p className="text-red-500">Failed to load refrigerators. Please try again later.</p>
    </CardContent>
  </Card>
)

// 메인 냉장고 목록 컴포넌트
export function RefrigeratorList({ refrigerators, onDelete }: Props) {
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useTranslations()

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.preventDefault()
    if (!onDelete) return

    try {
      await onDelete(id, e)
      toast({
        title: t('refrigerator.deleteSuccess'),
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('refrigerator.deleteError'),
      })
    }
  }

  if (refrigerators.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">{t('refrigerator.noRefrigerators')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {refrigerators.map((refrigerator) => (
        <Link
          key={refrigerator.id}
          href={`/refrigerators/${refrigerator.id}`}
          className="transition-transform hover:scale-[1.02] focus:scale-[1.02]"
        >
          <Card className="h-full bg-card hover:bg-accent/5 transition-colors">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-xl line-clamp-2 mb-2">
                      {refrigerator.name}
                    </h3>
                    {refrigerator.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {refrigerator.description}
                      </p>
                    )}
                  </div>
                  {refrigerator.isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDelete(refrigerator.id, e)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users2 className="h-4 w-4" />
                    <span>{t('refrigerator.memberCount', { count: refrigerator.memberCount })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    <span>{t('refrigerator.ingredientCount', { count: refrigerator.ingredientCount })}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-6 py-4 border-t bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t('refrigerator.role')}:</span>
                <span className="font-medium">
                  {refrigerator.role === 'owner' && t('refrigerator.roles.owner')}
                  {refrigerator.role === 'admin' && t('refrigerator.roles.admin')}
                  {refrigerator.role === 'viewer' && t('refrigerator.roles.viewer')}
                </span>
              </div>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
} 