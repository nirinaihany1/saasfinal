import React from 'react';
import { StatsCards } from '../components/dashboard/StatsCards';
import { RecentSales } from '../components/dashboard/RecentSales';
import { QuickActions } from '../components/dashboard/QuickActions';
import { AnalyticsSection } from '../components/dashboard/AnalyticsSection';

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <div className="text-sm text-gray-500">
          Aujourd'hui, {new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2">
          <RecentSales />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Analytics Section */}
      <AnalyticsSection />
    </div>
  );
};