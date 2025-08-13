import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { X, Upload, Package, Barcode, Store, AlertTriangle, Info } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ProductFormProps {
  product?: any;
  onSubmit: (productData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Store {
  id: string;
  name: string;
  isMainStore: boolean;
}

const units = [
  { id: 'piece', name: 'Pièce' },
  { id: 'kg', name: 'Kilogramme' },
  { id: 'g', name: 'Gramme' },
  { id: 'l', name: 'Litre' },
  { id: 'ml', name: 'Millilitre' },
  { id: 'box', name: 'Boîte' },
  { id: 'pack', name: 'Pack' },
];

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);
  const { user } = useAuthStore();

  // Utiliser un état séparé pour les stocks par magasin pour éviter les problèmes de référence
  const [storeStocks, setStoreStocks] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    reference: product?.reference || '',
    barcode: product?.barcode || '',
    categoryId: product?.categoryId || '',
    brand: product?.brand || '',
    salePrice: product?.salePrice || '',
    purchasePrice: product?.purchasePrice || '',
    taxRate: product?.taxRate || 20,
    stock: product?.stock || '',
    minStock: product?.minStock || '',
    unit: product?.unit || 'piece',
    isActive: product?.isActive !== false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les catégories depuis Firestore
  useEffect(() => {
    const loadCategories = async () => {
      if (!user?.establishmentId) return;

      try {
        setLoadingCategories(true);
        const q = query(
          collection(db, 'categories'),
          where('establishmentId', '==', user.establishmentId)
        );
        
        const snapshot = await getDocs(q);
        const categoriesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            color: data.color
          } as Category;
        });

        setCategories(categoriesData);
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [user?.establishmentId]);

  // Charger les magasins depuis Firestore
  useEffect(() => {
    const loadStores = async () => {
      if (!user?.establishmentId) return;

      try {
        setLoadingStores(true);
        const q = query(
          collection(db, 'stores'),
          where('establishmentId', '==', user.establishmentId),
          where('isActive', '==', true)
        );
        
        const snapshot = await getDocs(q);
        const storesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            isMainStore: data.isMainStore || false
          } as Store;
        });

        setStores(storesData);
      } catch (error) {
        console.error('Erreur lors du chargement des magasins:', error);
      } finally {
        setLoadingStores(false);
      }
    };

    loadStores();
  }, [user?.establishmentId]);

  // Initialiser les stocks par magasin avec les valeurs du produit existant
  useEffect(() => {
    if (product && stores.length > 0) {
      // Créer un nouvel objet pour les stocks par magasin
      const initialStoreStocks: Record<string, number> = {};
      
      // Si le produit a des stocks par magasin, les utiliser
      if (product.storeStock) {
        // Pour chaque magasin, récupérer son stock ou mettre 0
        stores.forEach(store => {
          initialStoreStocks[store.id] = product.storeStock[store.id] || 0;
        });
      } else {
        // Si le produit n'a pas de stocks par magasin, initialiser avec 0
        // Sauf pour le magasin principal qui prend le stock global
        stores.forEach(store => {
          initialStoreStocks[store.id] = store.isMainStore ? product.stock : 0;
        });
      }
      
      setStoreStocks(initialStoreStocks);
    } else if (stores.length > 0) {
      // Pour un nouveau produit, initialiser tous les stocks à 0
      const initialStoreStocks: Record<string, number> = {};
      stores.forEach(store => {
        initialStoreStocks[store.id] = 0;
      });
      setStoreStocks(initialStoreStocks);
    }
  }, [product, stores]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleStoreStockChange = (storeId: string, value: string) => {
    // Convertir la valeur en nombre (ou 0 si non valide)
    const numValue = parseInt(value);
    const stockValue = isNaN(numValue) ? 0 : numValue;
    
    // IMPORTANT: Créer une nouvelle référence pour l'objet storeStocks
    setStoreStocks(prevStocks => ({
      ...prevStocks,
      [storeId]: stockValue // Remplacer directement la valeur, ne pas additionner
    }));
  };

  const generateReference = () => {
    const category = categories.find(c => c.id === formData.categoryId);
    const prefix = category ? category.name.substring(0, 2).toUpperCase() : 'PR';
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    handleChange('reference', `${prefix}${random}`);
  };

  const generateBarcode = () => {
    const barcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    handleChange('barcode', barcode);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Le nom est requis';
    if (!formData.reference.trim()) newErrors.reference = 'La référence est requise';
    if (!formData.categoryId) newErrors.categoryId = 'La catégorie est requise';
    if (!formData.salePrice || Number(formData.salePrice) <= 0) {
      newErrors.salePrice = 'Le prix de vente doit être supérieur à 0';
    }
    if (!formData.purchasePrice || Number(formData.purchasePrice) <= 0) {
      newErrors.purchasePrice = 'Le prix d\'achat doit être supérieur à 0';
    }
    if (Number(formData.salePrice) <= Number(formData.purchasePrice)) {
      newErrors.salePrice = 'Le prix de vente doit être supérieur au prix d\'achat';
    }
    
    // Validation du stock uniquement si nous n'avons pas de magasins
    if (stores.length === 0) {
      if (!formData.stock || Number(formData.stock) < 0) {
        newErrors.stock = 'Le stock doit être supérieur ou égal à 0';
      }
    } else {
      // Vérifier si au moins un magasin a du stock
      const totalStock = Object.values(storeStocks).reduce((sum, value) => sum + value, 0);
      if (totalStock < 0) {
        newErrors.storeStock = 'Le stock total doit être supérieur ou égal à 0';
      }
    }
    
    if (!formData.minStock || Number(formData.minStock) < 0) {
      newErrors.minStock = 'Le stock minimum doit être supérieur ou égal à 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Calculer le stock total à partir des stocks par magasin
      let totalStock = 0;
      
      // Si nous avons des magasins, calculer le stock total
      if (stores.length > 0) {
        totalStock = Object.values(storeStocks).reduce((sum, value) => sum + value, 0);
      } else {
        // Sinon, utiliser le stock global
        totalStock = Number(formData.stock);
      }
      
      const productData = {
        ...formData,
        salePrice: Number(formData.salePrice),
        purchasePrice: Number(formData.purchasePrice),
        taxRate: Number(formData.taxRate),
        stock: totalStock,
        minStock: Number(formData.minStock),
        storeStock: storeStocks // Utiliser l'objet storeStocks séparé
      };
      onSubmit(productData);
    }
  };

  const calculateMargin = () => {
    const sale = Number(formData.salePrice) || 0;
    const purchase = Number(formData.purchasePrice) || 0;
    if (purchase > 0) {
      return (((sale - purchase) / purchase) * 100).toFixed(1);
    }
    return '0';
  };

  // Calculer le stock total à partir des stocks par magasin
  const calculateTotalStock = () => {
    return Object.values(storeStocks).reduce((sum, value) => sum + value, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" padding="none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {product ? 'Modifier le produit' : 'Ajouter un produit'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Image Upload Section */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <div className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Image du produit</p>
                    <Button variant="ghost" size="sm" className="mt-2">
                      <Upload className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => handleChange('isActive', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                      Produit actif
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Nom du produit *"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      error={errors.name}
                      placeholder="Ex: MacBook Pro 13 pouces"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Description détaillée du produit..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      label="Référence *"
                      value={formData.reference}
                      onChange={(e) => handleChange('reference', e.target.value)}
                      error={errors.reference}
                      placeholder="REF001"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateReference}
                      className="mt-6"
                    >
                      Générer
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      label="Code-barres"
                      value={formData.barcode}
                      onChange={(e) => handleChange('barcode', e.target.value)}
                      leftIcon={<Barcode className="w-4 h-4" />}
                      placeholder="123456789012"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateBarcode}
                      className="mt-6"
                    >
                      Générer
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catégorie *
                    </label>
                    {loadingCategories ? (
                      <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        Chargement des catégories...
                      </div>
                    ) : (
                      <select
                        value={formData.categoryId}
                        onChange={(e) => handleChange('categoryId', e.target.value)}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          errors.categoryId ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Sélectionner une catégorie</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>}
                    {categories.length === 0 && !loadingCategories && (
                      <p className="mt-1 text-sm text-orange-600">
                        Aucune catégorie trouvée. Créez d'abord des catégories dans la section "Catégories".
                      </p>
                    )}
                  </div>

                  <Input
                    label="Marque"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    placeholder="Ex: Apple, Samsung, HP..."
                  />
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tarification</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Prix d'achat (Ar) *"
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => handleChange('purchasePrice', e.target.value)}
                    error={errors.purchasePrice}
                    placeholder="1000000"
                  />
                  
                  <Input
                    label="Prix de vente (Ar) *"
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) => handleChange('salePrice', e.target.value)}
                    error={errors.salePrice}
                    placeholder="1200000"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marge bénéficiaire
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                      <span className="text-lg font-semibold text-green-600">
                        {calculateMargin()}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Taux de TVA (%)
                    </label>
                    <select
                      value={formData.taxRate}
                      onChange={(e) => handleChange('taxRate', Number(e.target.value))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={0}>0% (Exonéré)</option>
                      <option value={20}>20% (Standard Madagascar)</option>
                      <option value={5}>5% (Taux réduit)</option>
                      <option value={10}>10% (Taux intermédiaire)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Ce taux peut être modifié lors de la vente
                    </p>
                  </div>
                </div>
              </div>

              {/* Stock Management */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Gestion des stocks</h3>
                
                {stores.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-start mb-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800">Gestion multi-magasins</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Définissez le stock pour chaque magasin. Le stock total sera calculé automatiquement.
                          </p>
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-blue-800 mb-2">Stock par magasin</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stores.map(store => (
                          <div key={store.id} className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <Store className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-blue-700">
                                {store.name} {store.isMainStore && '(Principal)'}
                              </label>
                              <div className="mt-1 flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={storeStocks[store.id] || 0}
                                  onChange={(e) => handleStoreStockChange(store.id, e.target.value)}
                                  className="block w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                                />
                                <span className="ml-2 text-sm text-blue-600">{formData.unit}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-blue-600 mt-3">
                        Stock total: <strong>{calculateTotalStock()} {formData.unit}</strong>
                      </p>
                      {errors.storeStock && <p className="mt-1 text-sm text-red-600">{errors.storeStock}</p>}
                    </div>
                    
                    <Input
                      label="Stock minimum *"
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => handleChange('minStock', e.target.value)}
                      error={errors.minStock}
                      placeholder="2"
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unité de mesure
                      </label>
                      <select
                        value={formData.unit}
                        onChange={(e) => handleChange('unit', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {units.map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Stock actuel *"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => handleChange('stock', e.target.value)}
                      error={errors.stock}
                      placeholder="10"
                    />
                    
                    <Input
                      label="Stock minimum *"
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => handleChange('minStock', e.target.value)}
                      error={errors.minStock}
                      placeholder="2"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unité de mesure
                      </label>
                      <select
                        value={formData.unit}
                        onChange={(e) => handleChange('unit', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {units.map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="md:col-span-3">
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">Gestion de stock simplifiée</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              Vous n'avez pas encore configuré de magasins. Pour une gestion avancée des stocks par magasin, 
                              créez d'abord des magasins dans la section "Magasins".
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || categories.length === 0}>
              {isLoading ? 'Enregistrement...' : product ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProductForm;