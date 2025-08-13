import React from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Search, Download, Receipt, TrendingUp, RotateCcw, Calendar } from 'lucide-react';

interface SalesFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedPaymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  stats: {
    total: number;
    today: number;
    todayRevenue: number;
    completed: number;
    refunded: number;
  };
}

const statusOptions = [
  { id: 'all', name: 'Tous les statuts' },
  { id: 'completed', name: 'Terminées' },
  { id: 'refunded', name: 'Remboursées' },
];

const paymentMethodOptions = [
  { id: 'all', name: 'Tous les paiements' },
  { id: 'cash', name: 'Espèces' },
  { id: 'card', name: 'Carte' },
  { id: 'mvola', name: 'Mvola' },
  { id: 'orange_money', name: 'Orange Money' },
  { id: 'airtel_money', name: 'Airtel Money' },
];

export const SalesFilters: React.FC<SalesFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedPaymentMethod,
  onPaymentMethodChange,
  dateRange,
  onDateRangeChange,
  stats
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const setTodayRange = () => {
    const today = new Date().toISOString().split('T')[0];
    onDateRangeChange({ start: today, end: today });
  };

  const setWeekRange = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    onDateRangeChange({ 
      start: weekAgo.toISOString().split('T')[0], 
      end: today.toISOString().split('T')[0] 
    });
  };

  const setMonthRange = () => {
    const today = new Date();
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    onDateRangeChange({ 
      start: monthAgo.toISOString().split('T')[0], 
      end: today.toISOString().split('T')[0] 
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Receipt className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total ventes</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Aujourd'hui</p>
              <p className="text-2xl font-bold text-green-900">{stats.today}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">CA du jour</p>
              <p className="text-xl font-bold text-purple-900">{formatCurrency(stats.todayRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Receipt className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Terminées</p>
              <p className="text-2xl font-bold text-orange-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <RotateCcw className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Remboursées</p>
              <p className="text-2xl font-bold text-red-900">{stats.refunded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Input
            placeholder="Rechercher par reçu, client ou caissier..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="w-5 h-5 text-gray-400" />}
          />
          
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {statusOptions.map(status => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          <select
            value={selectedPaymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {paymentMethodOptions.map(method => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={setTodayRange}>
              <Calendar className="w-4 h-4 mr-1" />
              Aujourd'hui
            </Button>
            <Button variant="ghost" size="sm" onClick={setWeekRange}>
              <Calendar className="w-4 h-4 mr-1" />
              7 derniers jours
            </Button>
            <Button variant="ghost" size="sm" onClick={setMonthRange}>
              <Calendar className="w-4 h-4 mr-1" />
              30 derniers jours
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDateRangeChange({ start: '', end: '' });
              onStatusChange('all');
              onPaymentMethodChange('all');
              onSearchChange('');
            }}
          >
            Réinitialiser filtres
          </Button>
        </div>
      </div>
    </div>
  );
};