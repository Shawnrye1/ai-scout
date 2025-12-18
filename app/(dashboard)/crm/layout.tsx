'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  CircleDollarSign,
  CheckSquare,
  MessageSquare,
  Menu,
  Settings,
} from 'lucide-react';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { href: '/crm', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/crm/contacts', icon: Users, label: 'Contacts' },
    { href: '/crm/deals', icon: CircleDollarSign, label: 'Deals' },
    { href: '/crm/tasks', icon: CheckSquare, label: 'Tasks' },
    { href: '/crm/chat', icon: MessageSquare, label: 'AI Chat' },
  ];

  const isActive = (href: string) => {
    if (href === '/crm') {
      return pathname === '/crm';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-full w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <span className="font-semibold text-[#0f2d52]">CRM</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white border-r border-gray-200 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar header */}
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#0f2d52]">CRM</h2>
              <p className="text-sm text-gray-500">Manage your customers</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} passHref>
                  <Button
                    variant={isActive(item.href) ? 'secondary' : 'ghost'}
                    className={`w-full justify-start my-0.5 ${
                      isActive(item.href)
                        ? 'bg-[#0f2d52]/10 text-[#0f2d52] hover:bg-[#0f2d52]/15'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>

            {/* Sidebar footer */}
            <div className="p-3 border-t border-gray-100">
              <Link href="/dashboard" passHref>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-500 hover:text-gray-700"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
