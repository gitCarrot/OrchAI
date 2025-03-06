'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Shield, UserPlus, UserMinus, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Invitation {
  id: number;
  refrigeratorId: number;
  refrigeratorName: string;
  ownerId: string;
  ownerEmail: string;
  invitedEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  role: 'admin' | 'viewer';
}

export default function InvitationsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslations();
  const [receivedInvitations, setReceivedInvitations] = useState<Invitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInvitations = async () => {
    try {
      setIsLoading(true);
      const [receivedRes, sentRes] = await Promise.all([
        fetch('/api/refrigerators/invitations'),
        fetch('/api/refrigerators/invitations/sent')
      ]);

      if (!receivedRes.ok) throw new Error(t('refrigerator.invitations.loadError'));
      if (!sentRes.ok) throw new Error(t('refrigerator.invitations.loadError'));

      const [receivedData, sentData] = await Promise.all([
        receivedRes.json(),
        sentRes.json()
      ]);

      setReceivedInvitations(receivedData);
      setSentInvitations(sentData);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('refrigerator.invitations.loadError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitation = async (invitationId: number, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/refrigerators/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || t('refrigerator.invitations.processError'));
      }

      toast({
        title: action === 'accept' 
          ? t('refrigerator.invitations.acceptSuccess')
          : t('refrigerator.invitations.rejectSuccess'),
        description: action === 'accept'
          ? t('refrigerator.invitations.acceptSuccessDesc')
          : t('refrigerator.invitations.rejectSuccessDesc'),
      });

      loadInvitations();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('common.unknownError'),
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (invitationId: number) => {
    try {
      const res = await fetch(`/api/refrigerators/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || t('refrigerator.invitations.cancelError'));
      }

      toast({
        title: t('refrigerator.invitations.cancelSuccess'),
        description: t('refrigerator.invitations.cancelSuccessDesc'),
      });

      loadInvitations();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('common.unknownError'),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user?.emailAddresses[0]?.emailAddress) {
      loadInvitations();
    }
  }, [user?.emailAddresses]);

  if (!user) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: {
        text: t('refrigerator.invitations.statusPending'),
        className: "bg-yellow-100 text-yellow-800"
      },
      accepted: {
        text: t('refrigerator.invitations.statusAccepted'),
        className: "bg-green-100 text-green-800"
      },
      rejected: {
        text: t('refrigerator.invitations.statusRejected'),
        className: "bg-red-100 text-red-800"
      }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap];
    return statusInfo ? (
      <Badge variant="outline" className={statusInfo.className}>
        {statusInfo.text}
      </Badge>
    ) : null;
  };

  const getRoleText = (role: 'admin' | 'viewer') => {
    return role === 'admin' 
      ? t('refrigerator.share.roleAdmin')
      : t('refrigerator.share.roleViewer');
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-2">{t('refrigerator.invitations.title')}</h1>
      <p className="text-muted-foreground mb-8">{t('refrigerator.invitations.description')}</p>
      
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">{t('refrigerator.invitations.receivedTab')}</TabsTrigger>
          <TabsTrigger value="sent">{t('refrigerator.invitations.sentTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          <div className="grid gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                </CardContent>
              </Card>
            ) : receivedInvitations.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">
                      {t('refrigerator.invitations.noReceived')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {t('refrigerator.invitations.noReceivedDesc')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              receivedInvitations.map((invitation) => (
                <Card key={invitation.id} className={cn(
                  "transition-all duration-200",
                  invitation.status === 'pending' ? "border-yellow-200" : ""
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-xl">{invitation.refrigeratorName}</CardTitle>
                      <CardDescription>
                        {t('refrigerator.invitations.from')} {invitation.ownerEmail}
                      </CardDescription>
                    </div>
                    {getStatusBadge(invitation.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {t('refrigerator.invitations.invitedOn')} {new Date(invitation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        <span>
                          {t('refrigerator.invitations.role')}: {getRoleText(invitation.role)}
                        </span>
                      </div>
                      {invitation.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleInvitation(invitation.id, 'accept')}
                            className="w-full"
                          >
                            {t('refrigerator.invitations.accept')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleInvitation(invitation.id, 'reject')}
                            className="w-full"
                          >
                            {t('refrigerator.invitations.reject')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sent">
          <div className="grid gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                </CardContent>
              </Card>
            ) : sentInvitations.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <UserMinus className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">
                      {t('refrigerator.invitations.noSent')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {t('refrigerator.invitations.noSentDesc')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              sentInvitations.map((invitation) => (
                <Card key={invitation.id} className={cn(
                  "transition-all duration-200",
                  invitation.status === 'pending' ? "border-yellow-200" : ""
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-xl">{invitation.refrigeratorName}</CardTitle>
                      <CardDescription>
                        {t('refrigerator.invitations.to')} {invitation.invitedEmail}
                      </CardDescription>
                    </div>
                    {getStatusBadge(invitation.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {t('refrigerator.invitations.invitedOn')} {new Date(invitation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        <span>
                          {t('refrigerator.invitations.role')}: {getRoleText(invitation.role)}
                        </span>
                      </div>
                      {invitation.status === 'pending' && (
                        <Button
                          variant="outline"
                          onClick={() => cancelInvitation(invitation.id)}
                          className="w-full"
                        >
                          {t('refrigerator.invitations.cancel')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 