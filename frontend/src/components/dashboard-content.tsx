"use client";
import React from "react";
import { Card } from "@/components/ui/card";

export default function DashboardContent() {
  return (
    <div className="flex-1 p-6 bg-gray-100 dark:bg-gray-900">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome to the Academic AI Platform control center
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Total Users
          </h3>
          <p className="text-3xl font-bold text-blue-600 mb-2">2,847</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Active users across all roles
          </p>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            AI Workflows
          </h3>
          <p className="text-3xl font-bold text-green-600 mb-2">156</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Created and running workflows
          </p>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Data Sources
          </h3>
          <p className="text-3xl font-bold text-purple-600 mb-2">12</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connected Google Workspace APIs
          </p>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            System Performance
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">CPU</span>
              <span className="text-green-600">72%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '72%' }}></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Memory</span>
              <span className="text-yellow-600">85%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Security Status
          </h3>
          <p className="text-2xl font-bold text-green-600 mb-2">Secure</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All systems operational
          </p>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Recent Activity
          </h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              • New workflow created
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              • 3 users logged in
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              • System backup completed
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}