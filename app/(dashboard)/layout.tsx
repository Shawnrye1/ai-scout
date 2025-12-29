'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Home,
  LogOut,
  Video,
  Settings,
  Users,
  BarChart3,
  LayoutDashboard,
  Menu,
  X,
  ClipboardList,
  Shield,
  ChevronLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const navItems = [
  { href: '/home', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/games', label: 'Games', icon: Video },
  { href: '/roster', label: 'Roster', icon: ClipboardList },
  { href: '/players', label: 'Player Insights', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard', label: 'Settings', icon: Settings, exact: true },
];

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#0f2d52" />
      <circle cx="20" cy="16" r="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M12 28L20 20L28 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="28" r="2" fill="white" />
      <circle cx="28" cy="28" r="2" fill="white" />
    </svg>
  );
}

function NavLink({ href, label, icon: Icon, exact }: { href: string; label: string; icon: any; exact?: boolean }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[#0f2d52] text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  );
}

function UserSection() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-9 w-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback className="bg-[#0f2d52] text-white text-sm">
            {(user.name || user.email || 'U')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {user.name || 'User'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
        </div>
      </div>

      {user.role === 'admin' && (
        <Link
          href="/admin"
          className="flex items-center gap-2 px-3 py-2 mb-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Shield className="w-4 h-4" />
          Admin Dashboard
        </Link>
      )}

      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}

function MobileSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 lg:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <Link href="/home" className="flex items-center gap-3" onClick={onClose}>
              <Logo />
              <span className="font-bold text-gray-900 dark:text-white">AI Scout</span>
            </Link>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User section */}
          {user && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-[#0f2d52] text-white text-sm">
                    {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name || user.email}
                </div>
              </div>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className="flex items-center gap-2 px-3 py-2 mb-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex lg:flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/home" className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="font-bold text-gray-900 dark:text-white">AI Scout</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Coach Dashboard</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* User section */}
        <Suspense fallback={<div className="p-4 border-t border-gray-200 dark:border-gray-700" />}>
          <UserSection />
        </Suspense>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30">
        <div className="flex items-center justify-between h-full px-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>

          <Link href="/home" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-gray-900 dark:text-white">AI Scout</span>
          </Link>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-3 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
