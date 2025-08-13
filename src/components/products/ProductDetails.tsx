import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  X, 
  Package, 
  Tag, 
  DollarSign, 
  Barcode, 
  Info, 
  TrendingUp,
  Calendar,
  ShoppingCart,
  AlertTriangle
} from 'lucide-react';

interface ProductDetailsProps {
  product: any;
  onClose: () => void;
  onEdit: () => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onClose,
  onEdit
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calculateMargin = (salePrice: number, purchasePrice: number) => {
    if (purchasePrice > 0) {
      return (((salePrice - purchasePrice) / purchasePrice) * 100).toFixed(1);
    }
    return '0';
  };

  const getStockStatus = () => {
    if (product.stock === 0) {
      return { 
        label: 'Rupture de stock', 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
      };
    }
    if (product.stock <= product.minStock) {
      return { 
        label: 'Stock faible', 
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <AlertTriangle className="w-4 h-4 text-orange-600 mr-2" />
      };
    }
    return { 
      label: 'En stock', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <ShoppingCart className="w-4 h-4 text-green-600 mr-2" />
    };
  };

  const stockStatus = getStockStatus();
  const margin = calculateMargin(product.salePrice, product.purchasePrice);
  const marginNum = parseFloat(margin);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" padding="none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-2" />
            Détails du produit
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Header */}
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
              <div className="flex items-center mt-1 space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {product.category}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  product.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {product.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
              {product.description && (
                <p className="text-gray-600 mt-2">{product.description}</p>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Tag className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Référence</p>
                  <p className="font-semibold text-gray-900">{product.reference}</p>
                </div>
              </div>
              
              {product.barcode && (
                <div className="flex items-center">
                  <Barcode className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Code-barres</p>
                    <p className="font-semibold text-gray-900 font-mono">{product.barcode}</p>
                  </div>
                </div>
              )}
              
              {product.brand && (
                <div className="flex items-center">
                  <Info className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Marque</p>
                    <p className="font-semibold text-gray-900">{product.brand}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Créé le</p>
                  <p className="font-semibold text-gray-900">{formatDate(product.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Prix de vente</p>
                  <p className="font-semibold text-gray-900 text-lg">{formatCurrency(product.salePrice)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Prix d'achat</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(product.purchasePrice)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Marge bénéficiaire</p>
                  <p className={`font-semibold ${
                    marginNum >= 30 ? 'text-green-600' : 
                    marginNum >= 15 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {margin}%
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Info className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">TVA</p>
                  <p className="font-semibold text-gray-900">{product.taxRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stock Information */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Informations de stock</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">Stock actuel</p>
                <p className="text-2xl font-bold text-gray-900">{product.stock}</p>
                <p className="text-xs text-gray-500">Unité: {product.unit}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">Stock minimum</p>
                <p className="text-2xl font-bold text-gray-900">{product.minStock}</p>
                <p className="text-xs text-gray-500">Seuil d'alerte</p>
              </div>
              
              <div className={`bg-white p-3 rounded-lg border ${stockStatus.color}`}>
                <p className="text-sm text-gray-600">Statut</p>
                <p className="text-lg font-bold flex items-center">
                  {stockStatus.icon}
                  {stockStatus.label}
                </p>
                {product.stock <= product.minStock && product.stock > 0 && (
                  <p className="text-xs text-orange-600">Commander bientôt</p>
                )}
                {product.stock === 0 && (
                  <p className="text-xs text-red-600">Commander immédiatement</p>
                )}
              </div>
            </div>
          </div>

          {/* Valeur du stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Valeur d'achat du stock</h4>
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(product.purchasePrice * product.stock)}
              </p>
              <p className="text-sm text-blue-600">
                {product.stock} × {formatCurrency(product.purchasePrice)}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Valeur de vente du stock</h4>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(product.salePrice * product.stock)}
              </p>
              <p className="text-sm text-green-600">
                {product.stock} × {formatCurrency(product.salePrice)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={onEdit}>
            Modifier
          </Button>
        </div>
      </Card>
    </div>
  );
};