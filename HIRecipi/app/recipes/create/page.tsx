'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useTranslations } from "@/hooks/use-translations";
import { Loader2 } from "lucide-react";

const translationSchema = z.object({
  language: z.enum(['ko', 'en', 'ja']),
  title: z.string().min(1, "레시피 제목을 입력해주세요").max(100),
  description: z.string().optional(),
  content: z.string().min(1, "레시피 내용을 입력해주세요"),
});

const formSchema = z.object({
  translations: z.array(translationSchema).min(1, "최소 하나의 언어로 작성해주세요"),
  type: z.enum(["custom", "ai"]),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateRecipePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, currentLanguage } = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<{ id: number; name: string }[]>([]);
  const [newTag, setNewTag] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      translations: [{
        language: currentLanguage,
        title: "",
        description: "",
        content: "",
      }],
      type: "custom",
      isPublic: false,
      tags: [],
    },
  });

  // 태그 목록 불러오기
  const loadTags = async () => {
    try {
      const response = await fetch(`/api/tags?language=${currentLanguage}`);
      if (!response.ok) throw new Error("Failed to load tags");
      const data = await response.json();
      setAvailableTags(data);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  };

  // 새 태그 추가
  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTag,
          translations: [{
            language: currentLanguage,
            name: newTag,
          }],
        }),
      });
      if (!response.ok) throw new Error("Failed to create tag");
      const data = await response.json();
      setAvailableTags([...availableTags, data]);
      setNewTag("");
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleGenerateMultilingualRecipe = async () => {
    if (!content) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('recipe.error.contentRequired'),
      });
      return;
    }

    try {
      setIsLoading(true);
      setLoadingStep(t('recipe.loading.generating')); // "AI가 레시피 생성중"

      // 백엔드에 다국어 레시피 생성 요청
      const generateResponse = await fetch('/api/recipe/generate-multilingual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate multilingual recipe');
      }

      setLoadingStep(t('recipe.loading.translating')); // "멀티 언어로 레시피 변환중"
      const generatedData = await generateResponse.json();

      setLoadingStep(t('recipe.loading.saving')); // "레시피 생성후 저장중"
      // 생성된 레시피 저장
      const saveResponse = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translations: generatedData.translations,
          tags: generatedData.tags,
          type: 'ai',
          isPublic: true,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save recipe');
      }

      const savedRecipe = await saveResponse.json();
      router.push(`/recipes/${savedRecipe.id}`);
      
      toast({
        title: t('recipe.success.created'),
        description: t('recipe.success.createdDescription'),
      });
    } catch (error) {
      console.error('Error generating recipe:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('recipe.error.generate'),
      });
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // 로딩 상태 표시 컴포넌트
  const LoadingSpinner = ({ step }: { step: string }) => (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{step}</span>
    </div>
  );

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{t('recipe.create')}</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {form.watch('translations').map((translation, index) => (
              <div key={index} className="space-y-4 p-4 border rounded-lg">
                <FormField
                  control={form.control}
                  name={`translations.${index}.language`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.language')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.selectLanguage')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ko">한국어</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ja">日本語</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`translations.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('recipe.title')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('recipe.titlePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`translations.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('recipe.description')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('recipe.descriptionPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`translations.${index}.content`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('recipe.content')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('recipe.contentPlaceholder')}
                          className="min-h-[400px] font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const translations = form.getValues('translations');
                form.setValue('translations', [
                  ...translations,
                  {
                    language: 'ko',
                    title: '',
                    description: '',
                    content: '',
                  }
                ]);
              }}
            >
              {t('recipe.addTranslation')}
            </Button>

            <div className="space-y-4">
              <FormLabel>{t('recipe.tags')}</FormLabel>
              <div className="flex flex-wrap gap-2">
                {form.watch('tags').map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                    <button
                      type="button"
                      onClick={() => {
                        const tags = form.getValues('tags');
                        form.setValue('tags', tags.filter((_, i) => i !== index));
                      }}
                      className="ml-2"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder={t('recipe.newTagPlaceholder')}
                />
                <Button type="button" onClick={handleAddTag}>
                  {t('recipe.addTag')}
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recipe.type')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('recipe.selectType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="custom">{t('recipe.typeCustom')}</SelectItem>
                      <SelectItem value="ai">{t('recipe.typeAI')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>{t('recipe.isPublic')}</FormLabel>
                    <FormMessage />
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="accent-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 mt-6">
              {isLoading ? (
                <Button disabled className="w-full sm:w-auto">
                  <LoadingSpinner step={loadingStep} />
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleGenerateMultilingualRecipe}
                    className="w-full sm:w-auto"
                  >
                    {t('recipe.generateMultilingual')}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
} 