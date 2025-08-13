import React from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Search, Download, Users, Star, TrendingUp } from 'lucide-react';

interface CustomerFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onExport: () => void;
  stats: {
    total: number;
    active: number;
    vip: number;
    totalSpent: number;
  };
}

const statusOptions = [
  { id: 'all', name: 'Tous les clients' },
  { id: 'active', name: 'Clients actifs' },
  { id: 'inactive', name: 'Clients inactifs' },
  { id: 'vip', name: 'Clients VIP (200+ points)' },
];

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onExport,
  stats
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total clients</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Clients actifs</p>
              <p className="text-2xl font-bold text-green-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Star className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Clients VIP</p>
              <p className="text-2xl font-bold text-purple-900">{stats.vip}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">CA total</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(stats.totalSpent)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search className="w-5 h-5 text-gray-400" />}
            />
          </div>
          
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
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange('vip')}
              className={selectedStatus === 'vip' ? 'bg-purple-100 text-purple-700' : ''}
            >
              <Star className="w-4 h-4 mr-1" />
              Clients VIP ({stats.vip})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange('active')}
              className={selectedStatus === 'active' ? 'bg-green-100 text-green-700' : ''}
            >
              <Users className="w-4 h-4 mr-1" />
              Actifs ({stats.active})
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>
    </div>
  );
};