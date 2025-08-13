import React from 'react';
import { Button } from '../ui/Button';
import { 
  Package, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Eye, 
  MoreVertical,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  reference: string;
  salePrice: number;
  purchasePrice: number;
  stock: number;
  minStock: number;
  categoryId: string;
  category: string;
  taxRate: number;
  isActive: boolean;
  unit: string;
  brand?: string;
  barcode?: string;
}

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onView: (product: Product) => void;
  isLoading?: boolean;
  userRole: string;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDelete,
  onView,
  isLoading = false,
  userRole
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { status: 'out', color: 'red', text: 'Rupture', icon: AlertTriangle };
    if (stock <= minStock) return { status: 'low', color: 'orange', text: 'Stock faible', icon: AlertTriangle };
    return { status: 'good', color: 'green', text: 'En stock', icon: Package };
  };

  const calculateMargin = (salePrice: number, purchasePrice: number) => {
    if (purchasePrice > 0) {
      return (((salePrice - purchasePrice) / purchasePrice) * 100).toFixed(1);
    }
    return '0';
  };

  const getCategoryColor = (categoryId: string) => {
    const colors: Record<string, string> = {
      beverages: 'bg-blue-100 text-blue-800',
      food: 'bg-green-100 text-green-800',
      household: 'bg-purple-100 text-purple-800',
      electronics: 'bg-yellow-100 text-yellow-800',
      clothing: 'bg-pink-100 text-pink-800',
      health: 'bg-indigo-100 text-indigo-800',
    };
    return colors[categoryId] || 'bg-gray-100 text-gray-800';
  };

  // Vérifier si l'utilisateur est un lecteur (lecture seule)
  const isReadOnly = userRole === 'reader';

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
          <p className="text-gray-500 mb-6">Commencez par ajouter votre premier produit</p>
          {!isReadOnly && (
            <Button>
              <Package className="w-4 h-4 mr-2" />
              Ajouter un produit
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Référence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prix & Marge
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock, product.minStock);
              const margin = calculateMargin(product.salePrice, product.purchasePrice);
              const marginNum = parseFloat(margin);

              return (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          {product.brand && `${product.brand} • `}{product.unit}
                        </div>
                        {product.barcode && (
                          <div className="text-xs text-gray-400 font-mono">{product.barcode}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.reference}</div>
                    <div className="text-sm text-gray-500">TVA {product.taxRate}%</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(product.categoryId)}`}>
                      {product.category}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        Vente: {formatCurrency(product.salePrice)}
                      </div>
                      <div className="text-gray-500">
                        Achat: {formatCurrency(product.purchasePrice)}
                      </div>
                      <div className={`flex items-center text-xs ${marginNum >= 30 ? 'text-green-600' : marginNum >= 15 ? 'text-orange-600' : 'text-red-600'}`}>
                        {marginNum >= 15 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        Marge: {margin}%
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{product.stock}</div>
                        <div className="text-gray-500 text-xs">Min: {product.minStock}</div>
                      </div>
                      {(stockStatus.status === 'low' || stockStatus.status === 'out') && (
                        <AlertTriangle className={`w-4 h-4 ml-2 text-${stockStatus.color}-500`} />
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${stockStatus.color}-100 text-${stockStatus.color}-800`}>
                          {stockStatus.text}
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(product)}
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {!isReadOnly && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(product)}
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(product.id)}
                            title="Supprimer"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};