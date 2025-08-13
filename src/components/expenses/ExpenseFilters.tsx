import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Search, Download, DollarSign, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ExpenseFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedPaymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onExport: () => void;
  stats: {
    total: number;
    thisMonth: number;
    thisMonthAmount: number;
    pending: number;
    pendingAmount: number;
  };
}

interface ExpenseCategory {
  id: string;
  name: string;
}

const statusOptions = [
  { id: 'all', name: 'Tous les statuts' },
  { id: 'paid', name: 'Payées' },
  { id: 'pending', name: 'En attente' },
  { id: 'cancelled', name: 'Annulées' },
];

const paymentMethodOptions = [
  { id: 'all', name: 'Tous les paiements' },
  { id: 'cash', name: 'Espèces' },
  { id: 'card', name: 'Carte' },
  { id: 'bank_transfer', name: 'Virement bancaire' },
  { id: 'check', name: 'Chèque' },
];

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  selectedPaymentMethod,
  onPaymentMethodChange,
  dateRange,
  onDateRangeChange,
  onExport,
  stats
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const { user } = useAuthStore();

  // Charger les catégories de dépenses
  useEffect(() => {
    const loadCategories = async () => {
      if (!user?.establishmentId) return;

      try {
        const q = query(
          collection(db, 'expense_categories'),
          where('establishmentId', '==', user.establishmentId)
        );
        
        const snapshot = await getDocs(q);
        const categoriesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name
          } as ExpenseCategory;
        });

        setCategories(categoriesData);
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
      }
    };

    loadCategories();
  }, [user?.establishmentId]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Total dépenses</p>
              <p className="text-2xl font-bold text-red-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Ce mois</p>
              <p className="text-xl font-bold text-orange-900">{stats.thisMonth}</p>
              <p className="text-xs text-orange-700">{formatCurrency(stats.thisMonthAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">En attente</p>
              <p className="text-xl font-bold text-yellow-900">{stats.pending}</p>
              <p className="text-xs text-yellow-700">{formatCurrency(stats.pendingAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Moyenne/mois</p>
              <p className="text-xl font-bold text-purple-900">
                {formatCurrency(stats.thisMonthAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <Input
            placeholder="Rechercher par titre, fournisseur..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="w-5 h-5 text-gray-400" />}
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

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

          <Button variant="ghost" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>
    </div>
  );
};