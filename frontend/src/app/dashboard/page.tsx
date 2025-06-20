// frontend/src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { dashboardApi } from '@/lib/api';

// Dashboard stats data
const dashboardStats = [
  {
    title: 'Total Users',
    value: '24',
    change: '+12%',
    icon: '👥',
    color: 'bg-blue-500'
  },
  {
    title: 'Active Workflows',
    value: '8',
    change: '+3',
    icon: '⚙️',
    color: 'bg-green-500'
  },
  {
    title: 'AI Models',
    value: '4',
    change: 'Stable',
    icon: '🧠',
    color: 'bg-purple-500'
  },
  {
    title: 'API Requests',
    value: '1,204',
    change: '+18%',
    icon: '🔌',
    color: 'bg-orange-500'
  }
];

// Recent activity data
const recentActivity = [
  { id: 1, action: 'Created new workflow', user: 'Admin', time: '2 minutes ago' },
  { id: 2, action: 'Updated LLM settings', user: 'Admin', time: '1 hour ago' },
  { id: 3, action: 'API key renewed', user: 'System', time: '5 hours ago' },
  { id: 4, action: 'New user registered', user: 'System', time: '1 day ago' }
];

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [realStats, setRealStats] = useState<any>(null);

  useEffect(() => {
    // Check if user is authenticated using token
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load dashboard data
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      const response = await dashboardApi.stats();
      if (response?.success && response?.stats) {
        setRealStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-workflow':
        router.push('/dashboard/ai-playground');
        break;
      case 'new-chat':
        router.push('/dashboard/llm-playground');
        break;
      case 'view-logs':
        router.push('/dashboard/logs');
        break;
      default:
        console.log(`Action: ${action}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Use real stats if available, otherwise use demo data
  const displayStats = realStats ? [
    {
      title: 'AI Agents',
      value: realStats.agents.toString(),
      change: 'Active',
      icon: '🤖',
      color: 'bg-blue-500'
    },
    {
      title: 'Workflows',
      value: realStats.workflows.toString(),
      change: 'Created',
      icon: '⚙️',
      color: 'bg-green-500'
    },
    {
      title: 'Active Chats',
      value: realStats.activeChats.toString(),
      change: 'Running',
      icon: '💬',
      color: 'bg-purple-500'
    },
    {
      title: 'Integrations',
      value: realStats.integrations.toString(),
      change: 'Connected',
      icon: '🔌',
      color: 'bg-orange-500'
    }
  ] : dashboardStats;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back, Admin</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => handleQuickAction('create-workflow')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Create Workflow
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {displayStats.map((stat, index) => (
          <Card key={index} className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button 
                onClick={() => handleQuickAction('new-chat')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="mr-2">💬</span> Start New Chat Session
              </button>
              <button 
                onClick={() => router.push('/dashboard/agents')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="mr-2">🤖</span> Create AI Agent
              </button>
              <button 
                onClick={() => router.push('/dashboard/integrations')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="mr-2">🔌</span> Add Integration
              </button>
              <button 
                onClick={() => handleQuickAction('view-logs')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="mr-2">📜</span> View System Logs
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(realStats?.recentActivity || recentActivity).map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.action || activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      by {activity.user || 'System'} • {activity.time || new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}