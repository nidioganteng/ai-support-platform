import { Book } from 'lucide-react';

export default function KnowledgeBasePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 p-8 text-center animate-in fade-in duration-500">
      <div className="mb-4 rounded-full bg-neutral-900 p-4">
        <Book className="h-8 w-8 text-neutral-400" />
      </div>
      <h2 className="mb-2 text-xl font-semibold tracking-tight text-white">Knowledge Base (Coming Soon)</h2>
      <p className="max-w-sm text-sm text-neutral-400">
        This section will allow you to sync Markdown files and URLs to the Pinecone vector database.
      </p>
    </div>
  );
}
