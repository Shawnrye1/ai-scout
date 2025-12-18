'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Zap,
  Users,
  Building2,
  Target,
  Mail,
  CheckSquare,
  BarChart3,
  Play,
  Workflow,
  ListTree,
  Search,
  Slash,
  Bell,
  ChevronDown,
  ChevronRight,
  Star,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OutreachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [automationsOpen, setAutomationsOpen] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [recordsOpen, setRecordsOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="flex w-60 flex-col border-r bg-neutral-50/50">
        {/* Quick Actions */}
        <div className="p-3">
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-neutral-100 transition-colors">
            <Sparkles className="size-4" />
            <span>Quick actions</span>
            <kbd className="ml-auto text-[10px] font-medium text-muted-foreground bg-neutral-200/70 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Top Navigation */}
        <nav className="px-3 space-y-0.5">
          <SidebarItem
            href="/outreach/notifications"
            icon={Bell}
            label="Notifications"
            active={pathname === '/outreach/notifications'}
          />
          <SidebarItem
            href="/outreach/tasks"
            icon={CheckSquare}
            label="Tasks"
            active={pathname === '/outreach/tasks'}
          />
          <SidebarItem
            href="/outreach/emails"
            icon={Mail}
            label="Emails"
            active={pathname === '/outreach/emails'}
          />
          <SidebarItem
            href="/outreach/reports"
            icon={BarChart3}
            label="Reports"
            active={pathname === '/outreach/reports'}
          />

          {/* Automations - Collapsible */}
          <div className="pt-1">
            <button
              onClick={() => setAutomationsOpen(!automationsOpen)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-neutral-100 transition-colors"
            >
              {automationsOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span>Automations</span>
            </button>
            {automationsOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                <SidebarItem
                  href="/outreach/workflows"
                  icon={Workflow}
                  label="Workflows"
                  active={pathname === '/outreach/workflows'}
                />
                <SidebarItem
                  href="/outreach/sequences"
                  icon={ListTree}
                  label="Sequences"
                  active={pathname === '/outreach/sequences'}
                />
              </div>
            )}
          </div>
        </nav>

        {/* Favorites Section */}
        <div className="mt-4 px-3">
          <button
            onClick={() => setFavoritesOpen(!favoritesOpen)}
            className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {favoritesOpen ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            <span>Favorites</span>
          </button>
          {favoritesOpen && (
            <div className="mt-1 space-y-0.5">
              <SidebarItem
                href="/outreach/pipeline"
                icon={() => <span className="text-sm">🎯</span>}
                label="Onboarding pipeline"
                active={pathname === '/outreach/pipeline'}
              />
              <SidebarItem
                href="/outreach/funnel"
                icon={() => <span className="text-sm">📊</span>}
                label="Top of funnel"
                active={pathname === '/outreach/funnel'}
              />
              <SidebarItem
                href="/outreach/revops"
                icon={() => <span className="text-sm">⚙️</span>}
                label="RevOps workflows"
                active={pathname === '/outreach/revops'}
              />
            </div>
          )}
        </div>

        {/* Records Section */}
        <div className="mt-4 px-3 flex-1">
          <button
            onClick={() => setRecordsOpen(!recordsOpen)}
            className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {recordsOpen ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            <span>Records</span>
          </button>
          {recordsOpen && (
            <div className="mt-1 space-y-0.5">
              <SidebarItem
                href="/outreach/companies"
                icon={Building2}
                label="Companies"
                active={pathname.startsWith('/outreach/companies')}
                iconColor="text-purple-500"
              />
              <SidebarItem
                href="/outreach/people"
                icon={Users}
                label="People"
                active={pathname.startsWith('/outreach/people')}
                iconColor="text-blue-500"
              />
              <SidebarItem
                href="/outreach/deals"
                icon={Target}
                label="Deals"
                active={pathname.startsWith('/outreach/deals')}
                iconColor="text-amber-500"
              />
              <SidebarItem
                href="/outreach"
                icon={Zap}
                label="Workspaces"
                active={pathname === '/outreach'}
                iconColor="text-green-500"
              />
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="border-t p-3">
          <SidebarItem
            href="/outreach/settings"
            icon={Settings}
            label="Settings"
            active={pathname.startsWith('/outreach/settings')}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
}

function SidebarItem({
  href,
  icon: Icon,
  label,
  active,
  iconColor,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  iconColor?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        active
          ? 'bg-neutral-100 text-foreground font-medium'
          : 'text-muted-foreground hover:bg-neutral-100 hover:text-foreground'
      )}
    >
      <Icon className={cn('size-4', iconColor)} />
      <span>{label}</span>
    </Link>
  );
}
