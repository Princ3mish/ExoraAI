import { Link, useLocation } from 'react-router-dom';
import { Calendar, LayoutDashboard, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const adminLinks = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'All Meetings', href: '/dashboard/meetings', icon: Calendar },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const userLinks = [
  { name: 'My Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Meetings', href: '/dashboard/meetings', icon: Calendar },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const links = user?.role === 'ADMIN' ? adminLinks : userLinks;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card px-3 py-4">
      <div className="mb-8 px-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Exora AI</h1>
        <p className="text-xs text-muted-foreground uppercase mt-1 tracking-wider">{user?.role} PORTAL</p>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.name}
              to={link.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('mr-3 h-5 w-5 flex-shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} aria-hidden="true" />
              {link.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
