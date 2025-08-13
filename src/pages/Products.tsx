import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import ProductForm from '../components/products/ProductForm';
import { ProductFilters } from '../components/products/ProductFilters';
import { ProductTable } from '../components/products/ProductTable';
import { ProductDetails } from '../components/products/ProductDetails';
import { Plus, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';

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
  description?: string;
  establishmentId: string;
  createdAt: Date;
  updatedAt: Date;
  storeStock?: Record<string, number>;
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

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { user } = useAuthStore();

  // Charger les magasins
  const loadStores = async () => {
    if (!user?.establishmentId) return;

    try {
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
    }
  };

  // Charger les catégories
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
          name: data.name,
          color: data.color
        } as Category;
      });

      setCategories(categoriesData);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  };

  // Charger les produits
  const loadProducts = async () => {
    if (!user?.establishmentId) return;

    try {
      const q = query(
        collection(db, 'products'),
        where('establishmentId', '==', user.establishmentId)
      );
      
      const snapshot = await getDocs(q);
      const productsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const category = categories.find(c => c.id === data.categoryId);
        
        return {
          id: doc.id,
          name: data.name,
          reference: data.reference,
          salePrice: data.salePrice,
          purchasePrice: data.purchasePrice,
          stock: data.stock,
          minStock: data.minStock,
          categoryId: data.categoryId,
          category: category?.name || 'Catégorie inconnue',
          taxRate: data.taxRate,
          isActive: data.isActive,
          unit: data.unit,
          brand: data.brand,
          barcode: data.barcode,
          description: data.description,
          establishmentId: data.establishmentId,
          storeStock: data.storeStock || {},
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Product;
      });

      setProducts(productsData);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      toast.error('Erreur lors du chargement des produits');
    }
  };

  // Charger les données au démarrage
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      await loadStores();
      await loadCategories();
      await loadProducts();
      setLoadingData(false);
    };

    if (user?.establishmentId) {
      loadData();
    }
  }, [user?.establishmentId]);

  // Recharger les produits quand les catégories changent
  useEffect(() => {
    if (categories.length > 0) {
      loadProducts();
    }
  }, [categories]);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.includes(searchTerm)) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;

      let matchesStatus = true;
      switch (selectedStatus) {
        case 'active':
          matchesStatus = product.isActive;
          break;
        case 'inactive':
          matchesStatus = !product.isActive;
          break;
        case 'low_stock':
          matchesStatus = product.stock > 0 && product.stock <= product.minStock;
          break;
        case 'out_of_stock':
          matchesStatus = product.stock === 0;
          break;
        default:
          matchesStatus = true;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter(p => p.isActive).length,
      lowStock: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
      outOfStock: products.filter(p => p.stock === 0).length,
    };
  }, [products]);

  const handleAddProduct = () => {
    if (categories.length === 0) {
      toast.error('Créez d\'abord des catégories avant d\'ajouter des produits');
      return;
    }
    
    // Vérifier si l'utilisateur a le rôle approprié
    if (user?.role === 'reader') {
      toast.error('Vous n\'avez pas les permissions nécessaires pour ajouter des produits');
      return;
    }
    
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product: any) => {
    // Vérifier si l'utilisateur a le rôle approprié
    if (user?.role === 'reader') {
      toast.error('Vous n\'avez pas les permissions nécessaires pour modifier des produits');
      return;
    }
    
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    // Vérifier si l'utilisateur a le rôle approprié
    if (user?.role === 'reader') {
      toast.error('Vous n\'avez pas les permissions nécessaires pour supprimer des produits');
      return;
    }
    
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'products', productId));
      await loadProducts();
      toast.success('Produit supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setShowDetails(true);
  };

  const handleFormSubmit = async (productData: any) => {
    if (!user?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    // Vérifier si l'utilisateur a le rôle approprié
    if (user?.role === 'reader') {
      toast.error('Vous n\'avez pas les permissions nécessaires pour modifier des produits');
      return;
    }

    setIsLoading(true);
    
    try {
      if (editingProduct) {
        // Modifier un produit existant
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...productData,
          establishmentId: user.establishmentId,
          updatedAt: Timestamp.now()
        });
        toast.success('Produit modifié avec succès');
      } else {
        // Ajouter un nouveau produit
        const productId = `product_${Date.now()}`;
        await setDoc(doc(db, 'products', productId), {
          ...productData,
          establishmentId: user.establishmentId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('Produit ajouté avec succès');
      }
      
      await loadProducts();
      setShowForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Nom', 'Référence', 'Catégorie', 'Prix de vente', 'Prix d\'achat', 'Stock', 'Stock min', 'Statut'],
      ...filteredProducts.map(p => [
        p.name,
        p.reference,
        p.category,
        p.salePrice,
        p.purchasePrice,
        p.stock,
        p.minStock,
        p.isActive ? 'Actif' : 'Inactif'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produits_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export réalisé avec succès');
  };

  if (loadingData) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Produits</h1>
          <p className="text-gray-600 mt-1">
            Gérez votre catalogue de produits et suivez vos stocks
          </p>
        </div>
        {user?.role !== 'reader' && (
          <Button onClick={handleAddProduct}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un produit
          </Button>
        )}
      </div>

      {user?.role === 'reader' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Mode lecture seule</h4>
              <p className="text-sm text-yellow-700 mt-1">
                En tant que Lecteur, vous pouvez uniquement consulter les produits mais pas les modifier.
                Contactez un administrateur si vous avez besoin de ces permissions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {categories.length === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">
                Aucune catégorie trouvée
              </h3>
              <div className="mt-2 text-sm text-orange-700">
                <p>
                  Vous devez d'abord créer des catégories avant d'ajouter des produits.{' '}
                  <button 
                    onClick={() => window.location.href = '/categories'}
                    className="font-medium underline hover:text-orange-600"
                  >
                    Créer des catégories maintenant
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ProductFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onExport={handleExport}
        stats={stats}
      />

      <ProductTable
        products={filteredProducts}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
        onView={handleViewProduct}
        isLoading={false}
        userRole={user?.role || ''}
      />

      {showForm && (
        <ProductForm
          product={editingProduct}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          isLoading={isLoading}
        />
      )}

      {showDetails && selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={() => {
            setShowDetails(false);
            setSelectedProduct(null);
          }}
          onEdit={() => {
            setShowDetails(false);
            handleEditProduct(selectedProduct);
          }}
        />
      )}
    </div>
  );
};