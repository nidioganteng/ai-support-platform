import { MessageSquare } from 'lucide-react';

export default function ConversationsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 p-8 text-center animate-in fade-in duration-500">
      <div className="mb-4 rounded-full bg-neutral-900 p-4">
        <MessageSquare className="h-8 w-8 text-neutral-400" />
      </div>
      <h2 className="mb-2 text-xl font-semibold tracking-tight text-white">Conversations (Coming Soon)</h2>
      <p className="max-w-sm text-sm text-neutral-400">
        This is where support agents and users will view AI-assisted chat threads and handle handoffs.
      </p>
    </div>
  );
}
