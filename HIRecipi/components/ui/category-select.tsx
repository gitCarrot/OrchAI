import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Category {
  id: number;
  type: 'system' | 'custom';
  userId: string | null;
  translations: {
    language: 'ko' | 'en' | 'ja';
    name: string;
  }[];
}

interface CategorySelectProps {
  value?: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

export function CategorySelect({ value, onChange, placeholder }: CategorySelectProps) {
  const locale = useLocale();
  const [selectedValue, setSelectedValue] = useState<string>(value?.toString() || '');

  // 카테고리 목록 조회
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
  });

  // value prop이 변경되면 selectedValue 업데이트
  useEffect(() => {
    if (value) {
      setSelectedValue(value.toString());
    }
  }, [value]);

  // 카테고리 이름 가져오기
  const getCategoryName = (category: Category) => {
    const translation = category.translations.find(t => t.language === locale);
    return translation?.name || category.translations[0]?.name || '';
  };

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="로딩 중..." />
        </SelectTrigger>
      </Select>
    );
  }

  const systemCategories = categories?.filter(c => c.type === 'system') || [];
  const customCategories = categories?.filter(c => c.type === 'custom') || [];

  return (
    <Select
      value={selectedValue}
      onValueChange={(value) => {
        setSelectedValue(value);
        onChange(parseInt(value));
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder || "카테고리 선택"} />
      </SelectTrigger>
      <SelectContent>
        {systemCategories.length > 0 && (
          <SelectGroup>
            <SelectLabel>기본 카테고리</SelectLabel>
            {systemCategories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {getCategoryName(category)}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {customCategories.length > 0 && (
          <SelectGroup>
            <SelectLabel>사용자 카테고리</SelectLabel>
            {customCategories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {getCategoryName(category)}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
} 