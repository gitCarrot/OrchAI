'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IIngredient, IIngredientCategory } from "@/types";

interface AddIngredientModalProps {
  categories: IIngredientCategory[];
  onAdd: (ingredient: Omit<IIngredient, 'id'>) => void;
}

export function AddIngredientModal({ categories, onAdd }: AddIngredientModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [unit, setUnit] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId || !unit) return;

    onAdd({
      name,
      categoryId: parseInt(categoryId),
      unit
    });

    setOpen(false);
    setName('');
    setCategoryId('');
    setUnit('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">재료 추가</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새로운 재료 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">재료명</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 양파"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">카테고리</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">단위</Label>
            <Input
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="예: 개"
              required
            />
          </div>
          <Button type="submit" className="w-full">추가하기</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 