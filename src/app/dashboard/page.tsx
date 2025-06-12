// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    // Check if user is authenticated
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
      return;
    }

    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  // Quick action handler
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, Admin</p>
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
        {dashboardStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center text-white text-xl`}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <span>{stat.change} from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3"></div>
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <div className="flex mt-1 text-sm text-gray-500">
                      <p className="mr-2">{activity.user}</p>
                      <p>•</p>
                      <p className="ml-2">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button 
              onClick={() => handleQuickAction('create-workflow')}
              className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 flex items-center"
            >
              <span className="mr-3 text-lg">🧠</span>
              <div>
                <p className="font-medium">Create Workflow</p>
                <p className="text-sm text-gray-500">Build AI automation pipeline</p>
              </div>
            </button>
            
            <button 
              onClick={() => handleQuickAction('new-chat')}
              className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 flex items-center"
            >
              <span className="mr-3 text-lg">💬</span>
              <div>
                <p className="font-medium">New LLM Chat</p>
                <p className="text-sm text-gray-500">Interact with AI models</p>
              </div>
            </button>
            
            <button 
              onClick={() => handleQuickAction('view-logs')}
              className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 flex items-center"
            >
              <span className="mr-3 text-lg">📜</span>
              <div>
                <p className="font-medium">View Logs</p>
                <p className="text-sm text-gray-500">Check system activities</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}