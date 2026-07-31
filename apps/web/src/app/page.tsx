const upcomingSections = [
  { name: 'Knowledge Base', phase: 'Phase 2–3' },
  { name: 'Conversations', phase: 'Phase 4' },
  { name: 'Tickets', phase: 'Phase 6' },
  { name: 'Analytics', phase: 'Phase 7' },
  { name: 'Settings & Billing', phase: 'Phase 8' },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6">
      <div>
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Phase 0 — Foundation
        </p>
        <h1 className="text-3xl font-bold">AI Support Platform</h1>
        <p className="mt-2 text-neutral-400">
          Monorepo scaffold is up. Auth, knowledge base, and chat land in the phases below.
        </p>
      </div>

      <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
        {upcomingSections.map((section) => (
          <li
            key={section.name}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="text-neutral-200">{section.name}</span>
            <span className="text-neutral-500">{section.phase}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
