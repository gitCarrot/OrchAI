import { SentInvitations } from "@/components/refrigerators/sent-invitations";

export default function SentInvitationsPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">보낸 초대장</h1>
      <SentInvitations />
    </div>
  );
} 