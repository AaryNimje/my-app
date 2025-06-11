"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSidebar({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    router.push('/login');
  };

  const menuItems = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "AI Playground", href: "/dashboard/ai-playground", icon: "🧠" },
    { label: "LLM Playground", href: "/dashboard/llm-playground", icon: "💬" },
    { label: "Logs & History", href: "/dashboard/logs", icon: "📜" },
    { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Academic AI
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Admin Panel
          </p>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        
        <div className="absolute bottom-6 left-6">
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            <span className="mr-3">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}