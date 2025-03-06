'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const recipeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  isPublic: z.boolean().default(false),
});

export async function createRecipeAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parseResult = recipeSchema.safeParse({
    ...raw,
    isPublic: raw.isPublic === 'true',
  });

  if (!parseResult.success) {
    return { error: "Validation Error", issues: parseResult.error.issues };
  }

  const { title, content, isPublic } = parseResult.data;

  // TODO: DB 저장 로직 구현
  // await db.insert("recipes").values({...});

  revalidatePath('/recipes');
  return { success: true };
}

export async function toggleFavoriteAction(recipeId: string) {
  // TODO: DB 업데이트 로직 구현
  // await db.update("recipe_favorites").set({...});

  revalidatePath(`/recipes/${recipeId}`);
  return { success: true };
}

export async function togglePublicAction(recipeId: string) {
  // TODO: DB 업데이트 로직 구현
  // await db.update("recipes").set({...});

  revalidatePath(`/recipes/${recipeId}`);
  return { success: true };
} 