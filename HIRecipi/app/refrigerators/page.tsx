'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Refrigerator, Plus, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import Link from "next/link";
import { useNavigationStore } from '@/store/navigation';
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/use-translations";
import { AddRefrigeratorDialog } from "@/components/refrigerators/add-refrigerator-dialog";

interface RefrigeratorItem {
  id: number;
  name: string;
  description: string | null;
  memberCount: number;
  ingredientCount: number;
  role: 'owner' | 'admin' | 'viewer';
  createdAt: string;
}

export default function RefrigeratorsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [refrigerators, setRefrigerators] = useState<RefrigeratorItem[]>([]);
  const { setPage, setRefrigerator, reset } = useNavigationStore();
  const { toast } = useToast();
  const { t } = useTranslations();

  async function loadRefrigerators() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/refrigerators');
      if (!response.ok) {
        throw new Error('Failed to load refrigerators');
      }
      const data = await response.json();
      setRefrigerators(data);
    } catch (error) {
      console.error("[REFRIGERATORS_LOAD]", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('refrigerator.loadError'),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    reset();
    setPage('refrigerators-list-page');
    setRefrigerator(null);
    loadRefrigerators();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="container max-w-7xl mx-auto">
      <div className="flex flex-col items-center text-center space-y-4 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="p-3 rounded-full bg-primary/10 text-primary"
        >
          <Refrigerator className="w-8 h-8" />
        </motion.div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          {t('common.refrigerator')}
        </h1>
        <p className="text-muted-foreground max-w-[600px] text-lg">
          {t('refrigerator.description')}
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex-1" />
        <AddRefrigeratorDialog onAdd={async (data) => {
          try {
            const response = await fetch('/api/refrigerators', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            });

            if (!response.ok) {
              throw new Error('Failed to create refrigerator');
            }

            const newRefrigerator = await response.json();
            setRefrigerators([newRefrigerator, ...refrigerators]);
            
            toast({
              title: t('refrigerator.createSuccess'),
            });
          } catch (error) {
            console.error("[REFRIGERATOR_CREATE]", error);
            toast({
              variant: "destructive",
              title: t('common.error'),
              description: t('refrigerator.createError'),
            });
          }
        }} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-[100px] bg-muted rounded-t-lg" />
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : refrigerators.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-muted-foreground">
            {t('refrigerator.noRefrigerators')}
          </p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {refrigerators.map((refrigerator) => (
            <motion.div key={refrigerator.id} variants={item}>
              <Link href={`/refrigerators/${refrigerator.id}`}>
                <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                        {refrigerator.name}
                      </CardTitle>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        refrigerator.role === 'owner' && "bg-primary/10 text-primary",
                        refrigerator.role === 'admin' && "bg-blue-500/10 text-blue-500",
                        refrigerator.role === 'viewer' && "bg-muted text-muted-foreground"
                      )}>
                        {t(`refrigerator.roles.${refrigerator.role}`)}
                      </span>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {refrigerator.description || t('refrigerator.noDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {t('refrigerator.memberCount', { count: refrigerator.memberCount })}
                      </div>
                      <div>•</div>
                      <div>
                        {t('refrigerator.ingredientCount', { count: refrigerator.ingredientCount })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
} 