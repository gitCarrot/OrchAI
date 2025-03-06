import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useLocale } from 'next-intl';

interface CategoryCreateProps {
  onSuccess?: () => void;
}

export function CategoryCreate({ onSuccess }: CategoryCreateProps) {
  const [name, setName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const locale = useLocale();

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const translations = {
        [locale]: name,
      };

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ translations }),
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setName('');
      toast({
        title: '카테고리 생성 완료',
        description: '새로운 카테고리가 생성되었습니다.',
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: '카테고리 생성 실패',
        description: '카테고리 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createCategory.mutate(name);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category-name">새 카테고리 이름</Label>
        <Input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="카테고리 이름을 입력하세요"
          disabled={createCategory.isPending}
        />
      </div>
      <Button 
        type="submit" 
        disabled={!name.trim() || createCategory.isPending}
      >
        {createCategory.isPending ? '생성 중...' : '카테고리 생성'}
      </Button>
    </form>
  );
} 