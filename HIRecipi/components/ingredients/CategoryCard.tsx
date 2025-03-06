'use client';

import { Card, CardContent } from "@/components/ui/card";
import { IIngredientCategory } from "@/types";

interface CategoryCardProps {
  category: IIngredientCategory;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CategoryCard({ category, isSelected = false, onClick }: CategoryCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:scale-105 ${
        isSelected ? 'border-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-6">
        <span className="text-4xl mb-2">{category.icon}</span>
        <h3 className="text-lg font-semibold">{category.name}</h3>
      </CardContent>
    </Card>
  );
} 