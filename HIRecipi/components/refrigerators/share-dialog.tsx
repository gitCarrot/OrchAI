"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/use-translations";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refrigeratorId: number;
  onSuccess?: () => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  refrigeratorId,
  onSuccess,
}: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "admin">("viewer");
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(`/api/refrigerators/${refrigeratorId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('refrigerator.share.error'));
      }

      toast({
        title: t('refrigerator.share.success'),
        description: t('refrigerator.share.successDesc'),
      });

      setEmail("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error sharing refrigerator:", error);
      toast({
        variant: "destructive",
        title: t('refrigerator.share.error'),
        description: error instanceof Error ? error.message : t('refrigerator.share.errorDesc'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('refrigerator.share.title')}</DialogTitle>
          <DialogDescription>
            {t('refrigerator.share.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('refrigerator.share.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('refrigerator.share.emailPlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('refrigerator.share.roleLabel')}</Label>
              <Select value={role} onValueChange={(value: "viewer" | "admin") => setRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('refrigerator.share.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">{t('refrigerator.share.roleViewer')}</SelectItem>
                  <SelectItem value="admin">{t('refrigerator.share.roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || !email}
              className="w-full"
            >
              {isLoading ? t('common.loading') : t('refrigerator.share.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 