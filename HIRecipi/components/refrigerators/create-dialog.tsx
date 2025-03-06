'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "냉장고 이름을 입력해주세요").max(50),
  description: z.string().max(255).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Refrigerator {
  id: string;
  name: string;
  description: string | null;
  type: 'normal' | 'virtual';
  role: 'owner' | 'shared';
  isShared: boolean;
}

interface CreateRefrigeratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (refrigerator: Refrigerator) => void;
}

export function CreateRefrigeratorDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateRefrigeratorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  async function onSubmit(data: FormValues) {
    try {
      setIsLoading(true);
      const response = await fetch("/api/refrigerators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create refrigerator");
      }

      const refrigerator = await response.json();
      
      if (!refrigerator || !refrigerator.id) {
        throw new Error("Invalid response from server");
      }

      onSuccess(refrigerator);
      onOpenChange(false);
      form.reset();
      
      toast({
        title: "냉장고가 생성되었습니다",
        description: "이제 재료를 추가할 수 있습니다.",
      });
    } catch (error) {
      console.error("Error creating refrigerator:", error);
      toast({
        variant: "destructive",
        title: "오류가 발생했습니다",
        description: "잠시 후 다시 시도해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 냉장고 추가</DialogTitle>
          <DialogDescription>
            새로운 냉장고를 추가하고 재료를 관리하세요.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>냉장고 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="주방 냉장고" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명 (선택사항)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="냉장고에 대한 설명을 입력하세요"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "생성 중..." : "생성하기"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 