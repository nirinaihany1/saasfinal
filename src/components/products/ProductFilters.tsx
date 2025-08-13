import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Search, Filter, Download, AlertTriangle, Package } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ProductFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onExport: () => void;
  stats: {
    total: number;
    lowStock: number;
    outOfStock: number;
    active: number;
  };
}

interface Category {
  id: string;
  name: string;
}

const statusOptions = [
  { id: 'all', name: 'Tous les statuts' },
  { id: 'active', name: 'Actifs' },
  { id: 'inactive', name: 'Inactifs' },
  { id: 'low_stock', name: 'Stock faible' },
  { id: 'out_of_stock', name: 'Rupture de stock' },
];

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  onExport,
  stats
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const { user } = useAuthStore();

  // Charger les catégories
  useEffect(() => {
    const loadCategories = async () => {
      if (!user?.establishmentId) return;

      try {
        const q = query(
          collection(db, 'categories'),
          where('establishmentId', '==', user.establishmentId)
        );
        
        const snapshot = await getDocs(q);
        const categoriesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name
          } as Category;
        });

        setCategories(categoriesData);
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
      }
    };

    loadCategories();
  }, [user?.establishmentId]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total produits</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Actifs</p>
              <p className="text-2xl font-bold text-green-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Stock faible</p>
              <p className="text-2xl font-bold text-orange-900">{stats.lowStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Rupture</p>
              <p className="text-2xl font-bold text-red-900">{stats.outOfStock}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Rechercher par nom, référence ou code-barres..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search className="w-5 h-5 text-gray-400" />}
            />
          </div>
          
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
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange('low_stock')}
              className={selectedStatus === 'low_stock' ? 'bg-orange-100 text-orange-700' : ''}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Stock faible ({stats.lowStock})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange('out_of_stock')}
              className={selectedStatus === 'out_of_stock' ? 'bg-red-100 text-red-700' : ''}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Rupture ({stats.outOfStock})
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