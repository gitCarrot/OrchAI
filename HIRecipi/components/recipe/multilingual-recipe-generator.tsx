'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/use-translations';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface GeneratedRecipe {
  translations: {
    language: 'ko' | 'en' | 'ja';
    title: string;
    description: string;
    content: string;
  }[];
  tags: string[];
}

export function MultilingualRecipeGenerator() {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslations();

  const handleGenerateRecipe = async () => {
    if (!content.trim()) {
      toast({
        title: t('common.error'),
        description: t('recipe.generator.errorDesc'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const generateResponse = await fetch(`${BACKEND_URL}/api/recipe/generate-multilingual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.error || t('recipe.generator.errorDesc'));
      }

      const generatedRecipe: GeneratedRecipe = await generateResponse.json();

      const createRecipeData = {
        type: "ai",
        isPublic: true,
        translations: generatedRecipe.translations.map(t => ({
          language: t.language,
          title: t.title,
          description: t.description || "",
          content: t.content
        })),
        tags: generatedRecipe.tags.map(tag => ({
          name: tag,
          translations: [
            { language: 'ko', name: tag },
            { language: 'en', name: tag },
            { language: 'ja', name: tag }
          ]
        }))
      };

      const createResponse = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createRecipeData),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || t('recipe.generator.errorDesc'));
      }

      const newRecipe = await createResponse.json();

      toast({
        title: t('recipe.generator.success'),
        description: t('recipe.generator.successDesc'),
      });

      setContent('');
      router.push(`/recipes/${newRecipe.id}`);
    } catch (error) {
      console.error('Error generating recipe:', error);
      toast({
        title: t('recipe.generator.error'),
        description: error instanceof Error ? error.message : t('recipe.generator.errorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="mb-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-2xl bg-primary/5"
        >
          <Wand2 className="w-6 h-6 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-semibold text-foreground/90">
          {t('recipe.generator.multilingualTitle')}
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="space-y-4"
      >
        <div className="relative">
          <Textarea
            placeholder={t('recipe.generator.multilingualPlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full p-4 text-base bg-background border-2 border-input hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary rounded-xl shadow-sm transition-all duration-200"
          />
          <div className="absolute bottom-4 right-4">
            <Button
              onClick={handleGenerateRecipe}
              disabled={isLoading}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-2 px-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t('common.loading')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <Wand2 className="w-4 h-4" />
                  <span className="text-sm">{t('recipe.generator.multilingualButton')}</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 