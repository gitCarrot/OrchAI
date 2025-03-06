'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from "@/db";
import { refrigerators } from "@/db/schema";
import { eq } from "drizzle-orm";

const refrigeratorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const ingredientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.number(),
  unit: z.string().min(1, "Unit is required"),
});

export async function createRefrigeratorAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parseResult = refrigeratorSchema.safeParse(raw);

  if (!parseResult.success) {
    return { error: "Validation Error", issues: parseResult.error.issues };
  }

  const { name, description } = parseResult.data;

  // TODO: DB 저장 로직 구현
  // await db.insert("refrigerators").values({...});

  revalidatePath('/refrigerators');
  return { success: true };
}

export async function addIngredientAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parseResult = ingredientSchema.safeParse({
    ...raw,
    categoryId: Number(raw.categoryId),
  });

  if (!parseResult.success) {
    return { error: "Validation Error", issues: parseResult.error.issues };
  }

  const { name, categoryId, unit } = parseResult.data;

  // TODO: DB 저장 로직 구현
  // await db.insert("refrigerator_ingredients").values({...});

  revalidatePath('/refrigerators/[refrigeratorId]');
  return { success: true };
}

export async function updateIngredientAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parseResult = ingredientSchema.safeParse({
    ...raw,
    categoryId: Number(raw.categoryId),
  });

  if (!parseResult.success) {
    return { error: "Validation Error", issues: parseResult.error.issues };
  }

  const { name, categoryId, unit } = parseResult.data;

  // TODO: DB 업데이트 로직 구현
  // await db.update("refrigerator_ingredients").set({...});

  revalidatePath('/refrigerators/[refrigeratorId]');
  return { success: true };
}

export async function deleteIngredientAction(ingredientId: string) {
  // TODO: DB 삭제 로직 구현
  // await db.delete("refrigerator_ingredients").where({...});

  revalidatePath('/refrigerators/[refrigeratorId]');
  return { success: true };
}

// 냉장고 생성
export async function createRefrigerator(
  name: string,
  description: string | undefined,
  ownerId: string
) {
  try {
    const [refrigerator] = await db
      .insert(refrigerators)
      .values({
        name,
        description,
        ownerId,
      })
      .returning();

    revalidatePath('/refrigerators');
    return { refrigerator };
  } catch (error) {
    return { error: "Failed to create refrigerator" };
  }
}

// 냉장고 수정
export async function updateRefrigerator(
  id: number,
  name: string,
  description: string | undefined,
  ownerId: string
) {
  try {
    const [refrigerator] = await db
      .update(refrigerators)
      .set({
        name,
        description,
      })
      .where(eq(refrigerators.id, id))
      .returning();

    revalidatePath('/refrigerators/[refrigeratorId]');
    return { refrigerator };
  } catch (error) {
    return { error: "Failed to update refrigerator" };
  }
}

// 냉장고 삭제
export async function deleteRefrigerator(id: number) {
  try {
    const [refrigerator] = await db
      .delete(refrigerators)
      .where(eq(refrigerators.id, id))
      .returning();

    revalidatePath('/refrigerators/[refrigeratorId]');
    revalidatePath('/refrigerators');
    return { refrigerator };
  } catch (error) {
    return { error: "Failed to delete refrigerator" };
  }
} 