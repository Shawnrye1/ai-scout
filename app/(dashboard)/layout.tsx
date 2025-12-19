'use client';

import Link from 'next/link';
import { use, useState, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, LogOut, Video, Settings, Users, BarChart3, LayoutDashboard, Menu, X, CreditCard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <>
        <Link
          href="/pricing"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Pricing
        </Link>
        <Button asChild className="rounded-full bg-[#0f2d52] hover:bg-[#1a4a7a]">
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback className="bg-[#0f2d52] text-white">
            {(user.name || user.email || 'U')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/home" className="flex w-full items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/games" className="flex w-full items-center">
            <Video className="mr-2 h-4 w-4" />
            <span>Games</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/players" className="flex w-full items-center">
            <Users className="mr-2 h-4 w-4" />
            <span>Players</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/reports" className="flex w-full items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Reports</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard/billing" className="flex w-full items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="#0f2d52" />
      {/* Football/Play diagram icon */}
      <circle cx="20" cy="16" r="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M12 28L20 20L28 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="28" r="2" fill="white" />
      <circle cx="28" cy="28" r="2" fill="white" />
    </svg>
  );
}

function NavLink({ href, children, icon: Icon }: { href: string; children: React.ReactNode; icon: any }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 text-sm font-medium transition-colors ${
        isActive
          ? 'text-[#0f2d52]'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Logo className="h-8 w-8" />
            <span className="ml-2 text-xl font-bold text-gray-900">AI Scout</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/home" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink href="/games" icon={Video}>Games</NavLink>
            <NavLink href="/players" icon={Users}>Players</NavLink>
            <NavLink href="/reports" icon={BarChart3}>Reports</NavLink>
            <NavLink href="/dashboard/billing" icon={CreditCard}>Billing</NavLink>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Suspense fallback={<div className="h-9" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-gray-100 px-4 py-3 bg-white">
          <div className="flex flex-col gap-1">
            <MobileNavLink href="/home" icon={LayoutDashboard} onClick={() => setMobileMenuOpen(false)}>
              Dashboard
            </MobileNavLink>
            <MobileNavLink href="/games" icon={Video} onClick={() => setMobileMenuOpen(false)}>
              Games
            </MobileNavLink>
            <MobileNavLink href="/players" icon={Users} onClick={() => setMobileMenuOpen(false)}>
              Players
            </MobileNavLink>
            <MobileNavLink href="/reports" icon={BarChart3} onClick={() => setMobileMenuOpen(false)}>
              Reports
            </MobileNavLink>
            <MobileNavLink href="/dashboard/billing" icon={CreditCard} onClick={() => setMobileMenuOpen(false)}>
              Billing
            </MobileNavLink>
            <MobileNavLink href="/dashboard" icon={Settings} onClick={() => setMobileMenuOpen(false)}>
              Settings
            </MobileNavLink>
          </div>
        </nav>
      )}
    </header>
  );
}

function MobileNavLink({ href, children, icon: Icon, onClick }: { href: string; children: React.ReactNode; icon: any; onClick: () => void }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[#0f2d52]/10 text-[#0f2d52]'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      {children}
    </section>
  );
}
