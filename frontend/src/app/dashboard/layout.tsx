// frontend/src/app/dashboard/layout.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  BookOpen
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  const getNavigationItems = () => {
    const baseItems = [
      { href: '/dashboard', label: 'Dashboard', icon: Home }
    ];

    switch (user?.role) {
      case 'admin':
        return [
          ...baseItems,
          { href: '/dashboard/admin/users', label: 'User Management', icon: Users },
          { href: '/dashboard/workflows', label: 'Workflows', icon: FileText },
          { href: '/dashboard/settings', label: 'Settings', icon: Settings }
        ];
      
      case 'teacher':
        return [
          ...baseItems,
          { href: '/dashboard/teacher/qa-generator', label: 'Q&A Generator', icon: BookOpen },
          { href: '/dashboard/teacher/study-links', label: 'My Study Links', icon: FileText }
        ];
      
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 h-screen fixed left-0 top-0 border-r">
          <div className="p-6">
            <h2 className="text-xl font-bold">Academic AI Platform</h2>
            <p className="text-sm text-gray-600 mt-1">{user?.role} Dashboard</p>
          </div>
          
          <nav className="mt-6">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-6 py-3 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
            
            <button
              onClick={logout}
              className="flex items-center gap-3 px-6 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left mt-auto"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <header className="bg-white dark:bg-gray-800 border-b px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">
                Welcome, {user?.full_name || user?.email}
              </h1>
            </div>
          </header>
          
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}