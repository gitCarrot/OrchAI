import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Users } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface RefrigeratorCardProps {
  refrigerator: {
    id: number;
    name: string;
    description: string | null;
    ownerId: string;
    isOwner: boolean;
    role: 'owner' | 'member';
    memberCount: number;
    ingredientCount: number;
    createdAt: Date;
    updatedAt: Date;
  };
  onDelete?: () => void;
  onClick?: () => void;
}

export function RefrigeratorCard({ refrigerator, onDelete, onClick }: RefrigeratorCardProps) {
  const { name, description, memberCount, ingredientCount, updatedAt, isOwner } = refrigerator;

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{name}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          {isOwner && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive/90"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {memberCount}명
          </div>
          <div>
            식재료 {ingredientCount}개
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        마지막 업데이트: {formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: ko })}
      </CardFooter>
    </Card>
  );
} 