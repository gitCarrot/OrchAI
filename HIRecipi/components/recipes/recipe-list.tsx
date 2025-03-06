'use client'

import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from '@/hooks/use-translations'

interface Recipe {
  id: string
  title: string
  authorId: string
  authorName: string
  isPublic: boolean
  favoriteCount: number
}

interface Props {
  recipes: Recipe[]
  onDelete?: (id: string) => void
}

export function RecipeList({ recipes, onDelete }: Props) {
  const { toast } = useToast()
  const { t } = useTranslations()

  if (recipes.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">{t('recipe.noRecipes')}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <Link
          key={recipe.id}
          href={`/recipes/${recipe.id}`}
          className="block p-6 rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold">{recipe.title}</h3>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onDelete(recipe.id)
                }}
                className="text-sm text-destructive hover:text-destructive/80 transition-colors"
              >
                {t('common.delete')}
              </button>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>{t('recipe.role')}: {recipe.authorName}</p>
            <p>{t('recipe.likeCount', { count: recipe.favoriteCount })}</p>
            <p>{recipe.isPublic ? t('recipe.isPublic') : t('recipe.isPrivate')}</p>
          </div>
        </Link>
      ))}
    </div>
  )
} 