'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "@/hooks/use-translations";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SUPPORTED_LANGUAGES, Language } from "@/types";

const formSchema = z.object({
  language: z.enum(['ko', 'en', 'ja']),
  title: z.string().min(1, "레시피 제목을 입력해주세요"),
  description: z.string().optional(),
  content: z.string().min(1, "레시피 내용을 입력해주세요"),
  type: z.enum(["custom", "ai"]),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface AddRecipeModalProps {
  onAdd: (recipe: FormValues) => Promise<void>;
}

export function AddRecipeModal({ onAdd }: AddRecipeModalProps) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const { toast } = useToast();
  const { t, language: currentLanguage } = useTranslations();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: currentLanguage as Language,
      title: '',
      description: '',
      content: '',
      type: 'custom',
      isPublic: false,
      tags: [],
    },
  });

  // 태그 로드
  const loadTags = async () => {
    try {
      const response = await fetch(`/api/tags?language=${currentLanguage}`);
      if (!response.ok) throw new Error('Failed to load tags');
      const data = await response.json();
      setAvailableTags(data.map((tag: any) => tag.name));
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  // 태그 추가
  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    const tags = form.getValues('tags');
    if (tags.includes(newTag)) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('recipe.tagAlreadyExists'),
      });
      return;
    }

    form.setValue('tags', [...tags, newTag]);
    setNewTag('');
  };

  // 태그 삭제
  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags');
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await onAdd(data);
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating recipe:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('recipe.createError'),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t('recipe.create')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('recipe.createTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recipe.title')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('recipe.titlePlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recipe.description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('recipe.descriptionPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recipe.content')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('recipe.contentPlaceholder')}
                      className="min-h-[200px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>{t('recipe.tags')}</FormLabel>
              <div className="flex flex-wrap gap-2">
                {form.watch('tags').map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 hover:text-destructive"
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
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
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
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">{t('recipe.isPublic')}</FormLabel>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              {t('recipe.create')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 