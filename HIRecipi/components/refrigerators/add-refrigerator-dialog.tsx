'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Plus } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';

interface Props {
  onAdd: (data: { name: string; description: string }) => Promise<void>;
}

export function AddRefrigeratorDialog({ onAdd }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslations();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsLoading(true);
      await onAdd({ name, description });
      toast({
        title: t('refrigerator.createSuccess'),
      });
      setIsOpen(false);
      setName('');
      setDescription('');
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('refrigerator.createError'),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-5 w-5" />
          {t('refrigerator.new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('refrigerator.new')}</DialogTitle>
          <DialogDescription>
            {t('refrigerator.newDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('refrigerator.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('refrigerator.namePlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('refrigerator.description')} ({t('common.optional')})</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('refrigerator.descriptionPlaceholder')}
              className="resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.creating') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 