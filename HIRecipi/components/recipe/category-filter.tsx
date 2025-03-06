'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Utensils, 
  Soup, 
  Beef, 
  Fish, 
  Cake, 
  Pizza,
} from 'lucide-react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryFilterProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const categories = [
  { id: 'korean', name: '한식', icon: Soup, color: 'text-red-500 hover:text-red-600' },
  { id: 'chinese', name: '중식', icon: Utensils, color: 'text-orange-500 hover:text-orange-600' },
  { id: 'japanese', name: '일식', icon: Fish, color: 'text-blue-500 hover:text-blue-600' },
  { id: 'thai', name: '타이', icon: Beef, color: 'text-green-500 hover:text-green-600' },
  { id: 'fastfood', name: '패스트푸드', icon: Pizza, color: 'text-yellow-500 hover:text-yellow-600' },
  { id: 'dessert', name: '디저트', icon: Cake, color: 'text-pink-500 hover:text-pink-600' },
] as const;

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap rounded-lg">
        <div className="flex justify-center space-x-4 p-4">
          <div className="flex space-x-4">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              
              return (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectCategory(isSelected ? null : category.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 min-w-[72px]",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg p-2",
                    isSelected && "scale-105"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-full transition-colors duration-200",
                    isSelected ? "bg-primary/10" : "hover:bg-primary/5",
                  )}>
                    <Icon 
                      className={cn(
                        "w-6 h-6",
                        category.color,
                        isSelected && "animate-bounce"
                      )} 
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-colors duration-200",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}>
                    {category.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </div>
  );
} 