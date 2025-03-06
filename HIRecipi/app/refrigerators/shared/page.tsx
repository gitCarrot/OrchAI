'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Share2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Refrigerator {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  ownerId: string;
}

export default function SharedRefrigeratorsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [refrigerators, setRefrigerators] = useState<Refrigerator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRefrigerators();
  }, []);

  async function loadRefrigerators() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/refrigerators/shared');
      if (!response.ok) {
        throw new Error('Failed to load shared refrigerators');
      }
      const data = await response.json();
      setRefrigerators(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load shared refrigerators.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-8 bg-muted rounded w-2/3"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Shared Refrigerators</h1>
      </div>

      <Tabs defaultValue="shared" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="my" onClick={() => router.push('/refrigerators')}>
            My Refrigerators
          </TabsTrigger>
          <TabsTrigger value="shared">Shared Refrigerators</TabsTrigger>
        </TabsList>

        <TabsContent value="shared">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {refrigerators.map((refrigerator) => (
              <Card key={refrigerator.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        <Link href={`/refrigerators/${refrigerator.id}`} className="hover:underline">
                          {refrigerator.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        Public Refrigerator
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {refrigerator.description}
                  </p>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  Created: {new Date(refrigerator.createdAt).toLocaleDateString()}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 