'use client';

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/hooks/use-translations";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

interface Translation {
  language: 'ko' | 'en' | 'ja';
  title: string;
  description?: string;
  content: string;
}

interface Tag {
  id: number;
  name: string;
  translation: {
    language: string;
    name: string;
  };
}

interface Recipe {
  id: number;
  type: 'custom' | 'ai';
  translation: Translation;
  isPublic: boolean;
  ownerId: string;
  tags: Tag[];
  isFavorited?: boolean;
}

const defaultRecipe: Recipe = {
  id: 0,
  type: 'custom',
  translation: {
    language: 'ko',
    title: '',
    description: '',
    content: ''
  },
  isPublic: false,
  ownerId: '',
  tags: [],
  isFavorited: false
};

export default function EditRecipePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { t, language: currentLanguage } = useTranslations();
  const [recipe, setRecipe] = useState<Recipe>(defaultRecipe);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");

  // 현재 번역 데이터 관리
  const currentTranslation = useMemo(() => {
    return recipe.translation || {
      language: currentLanguage,
      title: '',
      description: '',
      content: ''
    };
  }, [recipe.translation, currentLanguage]);

  useEffect(() => {
    initialize();
  }, [params.recipeId, currentLanguage]); // 레시피 ID나 언어가 변경될 때마다 데이터 다시 로드

  async function initialize() {
    try {
      setIsLoading(true);
      await Promise.all([
        loadRecipe(),
        loadTags()
      ]);
    } catch (error) {
      console.error('Error initializing:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRecipe() {
    try {
      const { recipeId } = await Promise.resolve(params);
      const response = await fetch(`/api/recipes/${recipeId}?language=${currentLanguage}`);
      if (!response.ok) {
        throw new Error(t('common.error'));
      }

      const data = await response.json();
      setRecipe(data);
    } catch (error) {
      console.error('Error loading recipe:', error);
      throw error;
    }
  }

  async function loadTags() {
    try {
      const response = await fetch(`/api/tags?language=${currentLanguage}`);
      if (!response.ok) {
        throw new Error('Failed to load tags');
      }

      const data = await response.json();
      setAvailableTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
      throw error;
    }
  }

  async function handleAddTag() {
    if (!newTag.trim()) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTag,
          language: currentLanguage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create tag');
      }

      const createdTag = await response.json();
      setAvailableTags(prev => [...prev, createdTag]);
      setRecipe(prev => ({
        ...prev,
        tags: [...prev.tags, createdTag]
      }));
      setNewTag("");
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipe) return;

    try {
      setIsSaving(true);

      const response = await fetch(`/api/recipes/${params.recipeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          translations: [{
            language: currentLanguage,
            title: currentTranslation.title,
            description: currentTranslation.description,
            content: currentTranslation.content,
          }],
          isPublic: recipe.isPublic,
          tags: recipe.tags.map(tag => tag.name),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update recipe');
      }

      toast({
        title: t('common.success'),
        description: t('common.saved')
      });

      router.push(`/recipes/${params.recipeId}`);
    } catch (error) {
      console.error('Error updating recipe:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('recipe.error.update')
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('common.edit')}</h1>
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>{t('common.title')}</Label>
              <Input
                value={currentTranslation.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setRecipe(prev => ({
                    ...prev,
                    translation: {
                      ...prev.translation,
                      title: newTitle
                    }
                  }));
                }}
                placeholder={t('common.titlePlaceholder')}
              />
            </div>

            <div>
              <Label>{t('common.description')}</Label>
              <Input
                value={currentTranslation.description || ''}
                onChange={(e) => {
                  const newDescription = e.target.value;
                  setRecipe(prev => ({
                    ...prev,
                    translation: {
                      ...prev.translation,
                      description: newDescription
                    }
                  }));
                }}
                placeholder={t('common.descriptionPlaceholder')}
              />
            </div>

            <div>
              <Label>{t('common.content')}</Label>
              <Textarea
                value={currentTranslation.content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  setRecipe(prev => ({
                    ...prev,
                    translation: {
                      ...prev.translation,
                      content: newContent
                    }
                  }));
                }}
                placeholder={t('common.contentPlaceholder')}
                className="min-h-[400px] font-mono"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>{t('common.tags')}</Label>
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag.translation.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-2 hover:bg-transparent"
                    onClick={() => {
                      setRecipe(prev => ({
                        ...prev,
                        tags: prev.tags.filter((_, i) => i !== index)
                      }));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder={t('common.newTagPlaceholder')}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag}>
                {t('common.addTag')}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Switch
              checked={recipe.isPublic}
              onCheckedChange={(checked) => {
                setRecipe(prev => ({
                  ...prev,
                  isPublic: checked
                }));
              }}
            />
            <Label>{t('common.public')}</Label>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 