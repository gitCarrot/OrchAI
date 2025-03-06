'use client';

import { useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguageStore } from '@/store/language';
import { SUPPORTED_LANGUAGES, Language } from '@/types';
import { useToast } from "@/components/ui/use-toast";

export function LanguageSelector() {
  const { currentLanguage, setLanguage } = useLanguageStore();
  const { toast } = useToast();

  useEffect(() => {
    // 초기 언어 설정 가져오기
    fetch('/api/users/language')
      .then(res => res.json())
      .then(data => {
        if (data.language && data.language !== currentLanguage) {
          setLanguage(data.language as Language);
        }
      })
      .catch(error => {
        console.error('Error fetching language preference:', error);
      });
  }, []);

  const handleLanguageChange = async (language: Language) => {
    try {
      await setLanguage(language);
      toast({
        title: SUPPORTED_LANGUAGES[language].name,
        description: "언어가 변경되었습니다.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "오류가 발생했습니다",
        description: "언어 설정을 변경하지 못했습니다.",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 px-0">
          <span className="text-lg">{SUPPORTED_LANGUAGES[currentLanguage].flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.entries(SUPPORTED_LANGUAGES) as [Language, typeof SUPPORTED_LANGUAGES[Language]][]).map(([code, lang]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code)}
            className="cursor-pointer"
          >
            <span className="mr-2">{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 