import React from 'react';
import {
  BarChart3,
  FileText,
  Map,
  Radio,
  Route,
  Satellite,
  Ship,
  Workflow,
} from 'lucide-react';

interface WorkspaceSidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  isDemoMode: boolean;
  investigationStarted: boolean;
  statusLabels: Record<string, string | null>;
}

const sections = [
  {
    title: 'WORKSPACE',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: BarChart3 }],
  },
  {
    title: 'INVESTIGATION',
    items: [
      { id: 'spill-analysis', label: 'Spill Analysis', icon: Satellite },
      { id: 'drift-analysis', label: 'Drift & Origin', icon: Map },
      { id: 'vessel-intelligence', label: 'Vessels', icon: Ship },
      { id: 'timeline', label: 'Timeline', icon: Radio },
      { id: 'trajectory', label: 'Trajectory', icon: Route },
    ],
  },
  {
    title: 'OUTPUT',
    items: [
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'ai-pipeline', label: 'AI Pipeline', icon: Workflow },
    ],
  },
];

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  activeTab,
  onNavigate,
  isDemoMode,
  investigationStarted,
  statusLabels,
}) => (
  <aside className="hidden w-60 shrink-0 border-r border-[var(--ot-border)] bg-[var(--ot-card)] lg:block">
    <div className="sticky top-16 flex max-h-[calc(100vh-4rem)] flex-col gap-6 overflow-y-auto px-3 py-5">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="px-3 text-[10px] font-bold tracking-[0.14em] text-[var(--ot-muted)]">
            {section.title}
          </h2>
          <nav className="mt-2 space-y-1" aria-label={section.title}>
            {section.items.map(({ id, label, icon: Icon }) => {
              const statusLabel = !isDemoMode ? statusLabels[id] : null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={activeTab === id ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    activeTab === id
                      ? 'bg-[var(--ot-primary-soft)] font-semibold text-[var(--ot-primary)]'
                      : 'text-[var(--ot-text-secondary)] hover:bg-[var(--ot-shell)] hover:text-[var(--ot-text)]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">{label}</span>
                  {statusLabel && (
                    <span className="shrink-0 text-[10px] font-medium text-[var(--ot-muted)]">{statusLabel}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </section>
      ))}
      <div className="mt-auto rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3">
        <div className="text-[10px] font-semibold text-[var(--ot-muted)]">DATA MODE</div>
        <div className="mt-1 text-xs font-semibold text-[var(--ot-text)]">
          {isDemoMode ? 'Demo' : 'Live'}
        </div>
        {!isDemoMode && (
          <div className="mt-1 text-[10px] leading-4 text-[var(--ot-text-secondary)]">
            {investigationStarted ? 'Investigation in progress' : 'No live investigation started'}
          </div>
        )}
      </div>
    </div>
  </aside>
);
