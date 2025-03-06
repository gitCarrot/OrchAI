'use client';

import { Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';

interface SettingsMenuProps {
  onAddIngredient: () => void;
  onManageCategories: () => void;
  onShare: () => void;
  onManageMembers: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
}

export function SettingsMenu({
  onAddIngredient,
  onManageCategories,
  onShare,
  onManageMembers,
  onEdit,
  onDelete,
  isOwner = false,
}: SettingsMenuProps) {
  const { t } = useTranslations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onAddIngredient}>
          {t('refrigerator.addIngredient')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onManageCategories}>
          {t('category.manage')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShare}>
          {t('refrigerator.share.title')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onManageMembers}>
          {t('refrigerator.members.title')}
        </DropdownMenuItem>
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              {t('refrigerator.edit.title')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              {t('refrigerator.delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 