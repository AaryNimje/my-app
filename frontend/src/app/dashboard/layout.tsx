// frontend/src/app/dashboard/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

// Navigation items
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'AI Playground', href: '/dashboard/ai-playground', icon: '🧠' },
  { name: 'LLM Playground', href: '/dashboard/llm-playground', icon: '💬' },
  { name: 'Agents', href: '/dashboard/agents', icon: '🤖' },
  { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: '📚' },
  { name: 'Integrations', href: '/dashboard/integrations', icon: '🔌' },
  { name: 'Logs', href: '/dashboard/logs', icon: '📜' }
];

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await authApi.getProfile();
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    authApi.logout();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-md z-10 flex flex-col">
        {/* Logo and title */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Academic AI</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Admin Panel</p>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 flex-1">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-l-4 border-blue-500 dark:border-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user.full_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.role}
              </p>
              <button 
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}