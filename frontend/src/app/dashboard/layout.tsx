'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  BookOpen,
  Brain,
  MessageSquare,
  Bot,
  Plug,
  Database,
  ClipboardList,
  FileQuestion,
  Workflow
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: any;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const getNavigationItems = (): NavItem[] => {
    // Base items for all users
    const commonItems: NavItem[] = [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: '/dashboard/ai-playground', label: 'AI Playground', icon: Workflow },
      { href: '/dashboard/llm-playground', label: 'LLM Playground', icon: MessageSquare },
      { href: '/dashboard/agents', label: 'Agents', icon: Bot },
      { href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
      { href: '/dashboard/knowledge', label: 'Project Knowledge', icon: Database },
      { href: '/dashboard/logs', label: 'Logs', icon: ClipboardList },

    ];

    // Add role-specific items
    const roleSpecificItems: NavItem[] = [];

    if (user?.role === 'admin') {
      roleSpecificItems.push(
        { href: '/dashboard/admin/users', label: 'User Management', icon: Users }
      );
    }

    if (user?.role === 'teacher') {
      roleSpecificItems.push(
        { href: '/dashboard/teacher/qa-generator', label: 'Q&A Generator', icon: FileQuestion }
      );
    }

    // Combine common items with role-specific items
    return [...commonItems, ...roleSpecificItems];
  };

  const navigationItems = getNavigationItems();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Academic AI Platform
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'} Dashboard
            </p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-r-2 border-blue-500"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <IconComponent className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {navigationItems.find(item => isActive(item.href))?.label || 'Dashboard'}
              </h1>
              <div className="flex items-center gap-4">
                {/* Add any header actions here */}
              </div>
            </div>
          </header>
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}