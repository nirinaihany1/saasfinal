import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  X, 
  ArrowRight, 
  Plus, 
  Minus, 
  Trash2, 
  Save,
  Store,
  Package,
  FileText,
  AlertTriangle,
  Search,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Store as StoreType, StockTransferItem } from '../../types';

interface Product {
  id: string;
  name: string;
  reference: string;
  barcode?: string;
  stock: number;
  unit: string;
  storeStock?: Record<string, number>;
  categoryId: string;
  establishmentId: string;
  isActive: boolean;
  salePrice: number;
  purchasePrice: number;
}

interface StockTransferFormProps {
  onClose: () => void;
  onSuccess: () => void;
  existingTransfer?: any;
}

export const StockTransferForm: React.FC<StockTransferFormProps> = ({
  onClose,
  onSuccess,
  existingTransfer
}) => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSourceStore, setSelectedSourceStore] = useState<string>('');
  const [selectedDestinationStore, setSelectedDestinationStore] = useState<string>('');
  const [transferItems, setTransferItems] = useState<StockTransferItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productSearch, setProductSearch] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const { user } = useAuthStore();

  // Charger les magasins et les produits
  useEffect(() => {
    const loadData = async () => {
      if (!user?.establishmentId) return;
      
      setIsLoading(true);
      try {
        console.log('🔄 Chargement des données pour le transfert...');
        
        // Charger les magasins
        const storesQuery = query(
          collection(db, 'stores'),
          where('establishmentId', '==', user.establishmentId),
          where('isActive', '==', true)
        );
        
        const storesSnapshot = await getDocs(storesQuery);
        const storesData = storesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            address: data.address,
            phone: data.phone || '',
            email: data.email || '',
            establishmentId: data.establishmentId,
            isActive: data.isActive !== false,
            isMainStore: data.isMainStore || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as StoreType;
        });
        
        setStores(storesData);
        console.log('✅ Magasins chargés:', storesData.length);
        
        // Définir le magasin principal comme source par défaut
        const mainStore = storesData.find(store => store.isMainStore);
        if (mainStore && !existingTransfer) {
          setSelectedSourceStore(mainStore.id);
          console.log('📍 Magasin principal sélectionné comme source:', mainStore.name);
        }
        
        // Charger les produits
        const productsQuery = query(
          collection(db, 'products'),
          where('establishmentId', '==', user.establishmentId),
          where('isActive', '==', true)
        );
        
        const productsSnapshot = await getDocs(productsQuery);
        const productsData = productsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            reference: data.reference,
            barcode: data.barcode,
            stock: data.stock || 0,
            unit: data.unit || 'pièce',
            storeStock: data.storeStock || {},
            categoryId: data.categoryId,
            establishmentId: data.establishmentId,
            isActive: data.isActive !== false,
            salePrice: data.salePrice || 0,
            purchasePrice: data.purchasePrice || 0
          } as Product;
        });
        
        setProducts(productsData);
        console.log('✅ Produits chargés:', productsData.length);
        
        // Si on modifie un transfert existant, charger ses données
        if (existingTransfer) {
          setSelectedSourceStore(existingTransfer.sourceStoreId);
          setSelectedDestinationStore(existingTransfer.destinationStoreId);
          setTransferItems(existingTransfer.items || []);
          setNotes(existingTransfer.notes || '');
          console.log('📝 Transfert existant chargé:', existingTransfer.id);
        }
        
      } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user?.establishmentId, existingTransfer]);

  // Obtenir le stock disponible pour un produit dans un magasin
  const getProductStockInStore = (productId: string, storeId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || !storeId) return 0;
    
    // Si le produit a un stock spécifique pour ce magasin, l'utiliser
    if (product.storeStock && product.storeStock[storeId] !== undefined) {
      return product.storeStock[storeId];
    }
    
    // Sinon, utiliser le stock global (pour le magasin principal)
    const store = stores.find(s => s.id === storeId);
    if (store?.isMainStore) {
      return product.stock;
    }
    
    return 0;
  };

  // Filtrer les produits selon la recherche et disponibilité
  const getAvailableProducts = () => {
    if (!selectedSourceStore) {
      console.log('⚠️ Aucun magasin source sélectionné');
      return [];
    }
    
    const filtered = products.filter(product => {
      // Filtrer par recherche
      const matchesSearch = !productSearch || 
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.reference.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.barcode && product.barcode.includes(productSearch));
      
      // Vérifier que le produit n'est pas déjà dans le transfert
      const notInTransfer = !transferItems.some(item => item.productId === product.id);
      
      // Vérifier qu'il y a du stock dans le magasin source
      const stockInStore = getProductStockInStore(product.id, selectedSourceStore);
      const hasStock = stockInStore > 0;
      
      const isAvailable = matchesSearch && notInTransfer && hasStock;
      
      if (product.name.toLowerCase().includes('coca') || product.name.toLowerCase().includes('pain')) {
        console.log(`🔍 Produit ${product.name}:`, {
          matchesSearch,
          notInTransfer,
          hasStock,
          stockInStore,
          isAvailable
        });
      }
      
      return isAvailable;
    });
    
    console.log(`📦 Produits disponibles pour transfert: ${filtered.length}/${products.length}`);
    return filtered;
  };

  // Ajouter un produit au transfert
  const addProductToTransfer = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast.error('Produit non trouvé');
      return;
    }
    
    if (!selectedSourceStore) {
      toast.error('Veuillez sélectionner un magasin source');
      return;
    }
    
    // Vérifier le stock disponible
    const stockInStore = getProductStockInStore(product.id, selectedSourceStore);
    if (stockInStore <= 0) {
      toast.error('Aucun stock disponible pour ce produit dans le magasin source');
      return;
    }
    
    const newItem: StockTransferItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unit: product.unit,
      notes: ''
    };
    
    setTransferItems(prev => [...prev, newItem]);
    setShowProductSelector(false);
    setProductSearch('');
    
    console.log('✅ Produit ajouté au transfert:', product.name);
    toast.success(`${product.name} ajouté au transfert`);
  };

  // Mettre à jour la quantité d'un produit dans le transfert
  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    
    const item = transferItems.find(item => item.id === itemId);
    if (!item) return;
    
    const product = products.find(p => p.id === item.productId);
    if (!product) return;
    
    // Vérifier le stock disponible
    const availableStock = getProductStockInStore(product.id, selectedSourceStore);
    if (quantity > availableStock) {
      toast.error(`Stock insuffisant. Disponible: ${availableStock} ${product.unit}`);
      return;
    }
    
    setTransferItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
    
    console.log(`📝 Quantité mise à jour pour ${item.productName}: ${quantity}`);
  };

  // Supprimer un produit du transfert
  const removeItem = (itemId: string) => {
    const item = transferItems.find(i => i.id === itemId);
    setTransferItems(prev => prev.filter(item => item.id !== itemId));
    
    if (item) {
      console.log('🗑️ Produit retiré du transfert:', item.productName);
      toast.success('Produit retiré du transfert');
    }
  };

  // Valider le formulaire
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedSourceStore) {
      newErrors.sourceStore = 'Le magasin source est requis';
    }
    
    if (!selectedDestinationStore) {
      newErrors.destinationStore = 'Le magasin destination est requis';
    }
    
    if (selectedSourceStore === selectedDestinationStore) {
      newErrors.destinationStore = 'Les magasins source et destination doivent être différents';
    }
    
    if (transferItems.length === 0) {
      newErrors.items = 'Ajoutez au moins un produit au transfert';
    }
    
    // Vérifier que tous les produits ont des quantités valides
    for (const item of transferItems) {
      const availableStock = getProductStockInStore(item.productId, selectedSourceStore);
      if (item.quantity > availableStock) {
        newErrors.items = `Stock insuffisant pour ${item.productName}. Disponible: ${availableStock}`;
        break;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.establishmentId) return;
    
    setIsSubmitting(true);
    
    try {
      const sourceStore = stores.find(s => s.id === selectedSourceStore);
      const destinationStore = stores.find(s => s.id === selectedDestinationStore);
      
      if (!sourceStore || !destinationStore) {
        toast.error('Magasin non trouvé');
        return;
      }
      
      const transferId = existingTransfer ? existingTransfer.id : `transfer_${Date.now()}`;
      
      const transferData = {
        id: transferId,
        establishmentId: user.establishmentId,
        sourceStoreId: selectedSourceStore,
        sourceStoreName: sourceStore.name,
        destinationStoreId: selectedDestinationStore,
        destinationStoreName: destinationStore.name,
        items: transferItems,
        status: existingTransfer ? existingTransfer.status : 'pending',
        notes: notes,
        createdById: existingTransfer ? existingTransfer.createdById : user.id,
        createdByName: existingTransfer ? existingTransfer.createdByName : user.name,
        createdAt: existingTransfer ? existingTransfer.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      console.log('💾 Sauvegarde du transfert:', transferData);
      
      if (existingTransfer) {
        await updateDoc(doc(db, 'stock_transfers', transferId), transferData);
        toast.success('Transfert mis à jour avec succès');
      } else {
        await setDoc(doc(db, 'stock_transfers', transferId), transferData);
        toast.success('Transfert créé avec succès');
      }
      
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du transfert:', error);
      toast.error('Erreur lors de la sauvegarde du transfert');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compléter le transfert (mettre à jour les stocks)
  const completeTransfer = async () => {
    if (!user?.establishmentId || !existingTransfer) return;
    
    if (!window.confirm('Êtes-vous sûr de vouloir compléter ce transfert ? Cette action mettra à jour les stocks et ne pourra pas être annulée.')) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('🚀 Début de la complétion du transfert...');
      
      // Mettre à jour les stocks des produits
      for (const item of transferItems) {
        const productRef = doc(db, 'products', item.productId);
        const productDoc = await getDoc(productRef);
        
        if (productDoc.exists()) {
          const productData = productDoc.data();
          const currentStoreStock = productData.storeStock || {};
          
          // Calculer les nouveaux stocks
          const sourceStock = currentStoreStock[selectedSourceStore] !== undefined 
            ? currentStoreStock[selectedSourceStore] 
            : (stores.find(s => s.id === selectedSourceStore)?.isMainStore ? productData.stock : 0);
          
          const destinationStock = currentStoreStock[selectedDestinationStore] !== undefined 
            ? currentStoreStock[selectedDestinationStore] 
            : 0;
          
          const updatedStoreStock = {
            ...currentStoreStock,
            [selectedSourceStore]: Math.max(0, sourceStock - item.quantity),
            [selectedDestinationStore]: destinationStock + item.quantity
          };
          
          // Mettre à jour le stock global si nécessaire
          const isSourceMainStore = stores.find(s => s.id === selectedSourceStore)?.isMainStore;
          const isDestinationMainStore = stores.find(s => s.id === selectedDestinationStore)?.isMainStore;
          
          let updatedGlobalStock = productData.stock;
          
          if (isSourceMainStore && !isDestinationMainStore) {
            // Transfert depuis le magasin principal vers un autre magasin
            updatedGlobalStock = Math.max(0, updatedGlobalStock - item.quantity);
          } else if (!isSourceMainStore && isDestinationMainStore) {
            // Transfert depuis un autre magasin vers le magasin principal
            updatedGlobalStock = updatedGlobalStock + item.quantity;
          }
          // Si les deux sont des magasins secondaires, le stock global ne change pas
          
          await updateDoc(productRef, {
            storeStock: updatedStoreStock,
            stock: updatedGlobalStock,
            updatedAt: Timestamp.now()
          });
          
          console.log(`📦 Stock mis à jour pour ${item.productName}:`, {
            source: `${sourceStock} → ${updatedStoreStock[selectedSourceStore]}`,
            destination: `${destinationStock} → ${updatedStoreStock[selectedDestinationStore]}`,
            global: `${productData.stock} → ${updatedGlobalStock}`
          });
        }
      }
      
      // Mettre à jour le statut du transfert
      await updateDoc(doc(db, 'stock_transfers', existingTransfer.id), {
        status: 'completed',
        completedById: user.id,
        completedByName: user.name,
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      console.log('✅ Transfert complété avec succès');
      toast.success('Transfert complété avec succès ! Les stocks ont été mis à jour.');
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('❌ Erreur lors de la complétion du transfert:', error);
      toast.error('Erreur lors de la complétion du transfert');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ouvrir le sélecteur de produits
  const openProductSelector = async () => {
    if (!selectedSourceStore || !selectedDestinationStore) {
      toast.error('Veuillez sélectionner les magasins source et destination');
      return;
    }
    
    setLoadingProducts(true);
    setShowProductSelector(true);
    
    // Petit délai pour l'animation
    setTimeout(() => {
      setLoadingProducts(false);
    }, 500);
  };

  const availableProducts = getAvailableProducts();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl" padding="lg">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement des données...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto" padding="none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-2 text-blue-600" />
            {existingTransfer ? 'Détails du transfert de stock' : 'Nouveau transfert de stock'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Informations de debug */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">État du système</h4>
                  <div className="text-sm text-blue-700 mt-1 space-y-1">
                    <p>• Magasins disponibles: {stores.length}</p>
                    <p>• Produits actifs: {products.length}</p>
                    <p>• Produits avec stock: {products.filter(p => getProductStockInStore(p.id, selectedSourceStore) > 0).length}</p>
                    <p>• Produits disponibles pour transfert: {availableProducts.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sélection des magasins */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Magasin source *
                </label>
                <select
                  value={selectedSourceStore}
                  onChange={(e) => {
                    setSelectedSourceStore(e.target.value);
                    // Vider les items si on change de magasin source
                    if (transferItems.length > 0) {
                      setTransferItems([]);
                      toast.info('Produits retirés du transfert suite au changement de magasin source');
                    }
                  }}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.sourceStore ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={existingTransfer?.status === 'completed'}
                >
                  <option value="">Sélectionner un magasin source</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name} {store.isMainStore ? '(Principal)' : ''}
                    </option>
                  ))}
                </select>
                {errors.sourceStore && <p className="mt-1 text-sm text-red-600">{errors.sourceStore}</p>}
              </div>

              <div className="flex items-center">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Magasin destination *
                  </label>
                  <select
                    value={selectedDestinationStore}
                    onChange={(e) => setSelectedDestinationStore(e.target.value)}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.destinationStore ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={existingTransfer?.status === 'completed'}
                  >
                    <option value="">Sélectionner un magasin destination</option>
                    {stores
                      .filter(store => store.id !== selectedSourceStore)
                      .map(store => (
                        <option key={store.id} value={store.id}>
                          {store.name} {store.isMainStore ? '(Principal)' : ''}
                        </option>
                      ))}
                  </select>
                  {errors.destinationStore && <p className="mt-1 text-sm text-red-600">{errors.destinationStore}</p>}
                </div>
                <div className="mx-4 flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Avertissement si magasins non sélectionnés */}
            {(!selectedSourceStore || !selectedDestinationStore) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Sélection requise</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Veuillez sélectionner les magasins source et destination avant d'ajouter des produits au transfert.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Liste des produits à transférer */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Produits à transférer ({transferItems.length})
                </h3>
                {selectedSourceStore && selectedDestinationStore && existingTransfer?.status !== 'completed' && (
                  <Button 
                    type="button" 
                    variant="primary" 
                    size="sm"
                    onClick={openProductSelector}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un produit
                  </Button>
                )}
              </div>

              {errors.items && <p className="mt-1 text-sm text-red-600 mb-4">{errors.items}</p>}

              {transferItems.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit sélectionné</h3>
                  <p className="text-gray-500 mb-4">
                    {!selectedSourceStore || !selectedDestinationStore 
                      ? 'Sélectionnez d\'abord les magasins source et destination'
                      : 'Cliquez sur "Ajouter un produit" pour commencer le transfert'
                    }
                  </p>
                  {selectedSourceStore && selectedDestinationStore && existingTransfer?.status !== 'completed' && (
                    <Button 
                      type="button"
                      onClick={openProductSelector}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Sélectionner des produits
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produit
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock source
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantité à transférer
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transferItems.map((item) => {
                        const product = products.find(p => p.id === item.productId);
                        const availableStock = product ? getProductStockInStore(product.id, selectedSourceStore) : 0;
                        
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Package className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                                  <div className="text-sm text-gray-500">Réf: {product?.reference}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`text-sm font-medium ${
                                availableStock > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {availableStock} {item.unit}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {existingTransfer?.status === 'completed' ? (
                                <span className="text-sm font-medium text-gray-900">
                                  {item.quantity} {item.unit}
                                </span>
                              ) : (
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    max={availableStock}
                                    value={item.quantity}
                                    onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                    className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(item.id, Math.min(availableStock, item.quantity + 1))}
                                    className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
                                    disabled={item.quantity >= availableStock}
                                  >
                                    <Plus className="w-4 h-4 text-blue-600" />
                                  </button>
                                  <span className="text-sm text-gray-500 ml-2">{item.unit}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {existingTransfer?.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-900 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                  title="Supprimer ce produit"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Informations supplémentaires sur ce transfert..."
                disabled={existingTransfer?.status === 'completed'}
              />
            </div>

            {/* Statut du transfert */}
            {existingTransfer && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {existingTransfer.status === 'pending' ? (
                      <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                    ) : existingTransfer.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 mr-2" />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">Statut du transfert</h4>
                      <p className="text-sm text-gray-500">
                        {existingTransfer.status === 'pending' ? 'En attente de validation' : 
                         existingTransfer.status === 'completed' ? 'Transfert complété avec succès' : 
                         'Transfert annulé'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    existingTransfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    existingTransfer.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {existingTransfer.status === 'pending' ? 'En attente' : 
                     existingTransfer.status === 'completed' ? 'Complété' : 
                     'Annulé'}
                  </span>
                </div>
                {existingTransfer.status === 'completed' && existingTransfer.completedAt && (
                  <div className="mt-2 text-sm text-gray-500">
                    Complété le {new Date(existingTransfer.completedAt.seconds * 1000).toLocaleDateString()} 
                    par {existingTransfer.completedByName}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Fermer
            </Button>
            
            {existingTransfer?.status === 'pending' && transferItems.length > 0 && (
              <Button 
                type="button"
                variant="success"
                onClick={completeTransfer}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Traitement...' : 'Compléter le transfert'}
              </Button>
            )}
            
            {!existingTransfer && (
              <Button 
                type="submit"
                disabled={isSubmitting || !selectedSourceStore || !selectedDestinationStore || transferItems.length === 0}
              >
                {isSubmitting ? 'Enregistrement...' : 'Créer le transfert'}
              </Button>
            )}
          </div>
        </form>

        {/* Modal de sélection de produits */}
        {showProductSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto" padding="none">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Search className="w-5 h-5 mr-2 text-blue-600" />
                  Sélectionner des produits à transférer
                </h3>
                <button
                  onClick={() => {
                    setShowProductSelector(false);
                    setProductSearch('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Barre de recherche */}
                <div className="mb-6">
                  <Input
                    placeholder="Rechercher par nom, référence ou code-barres..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                  />
                </div>
                
                {/* Liste des produits */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loadingProducts ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Chargement des produits...</p>
                    </div>
                  ) : availableProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {!selectedSourceStore ? 'Magasin source requis' : 
                         products.length === 0 ? 'Aucun produit disponible' :
                         productSearch ? 'Aucun produit trouvé' :
                         'Aucun produit avec stock disponible'}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {!selectedSourceStore ? 'Sélectionnez d\'abord un magasin source' : 
                         products.length === 0 ? 'Créez des produits dans la section "Produits"' :
                         productSearch ? 'Aucun produit ne correspond à votre recherche' :
                         'Aucun produit n\'a de stock disponible dans le magasin source'}
                      </p>
                      <div className="mt-4 text-sm text-gray-400 space-y-1">
                        <p><strong>Statistiques :</strong></p>
                        <p>• Magasins actifs: {stores.length}</p>
                        <p>• Produits actifs: {products.length}</p>
                        <p>• Magasin source: {stores.find(s => s.id === selectedSourceStore)?.name || 'Non sélectionné'}</p>
                        {selectedSourceStore && (
                          <p>• Produits avec stock dans ce magasin: {products.filter(p => getProductStockInStore(p.id, selectedSourceStore) > 0).length}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    availableProducts.map(product => {
                      const stockInStore = getProductStockInStore(product.id, selectedSourceStore);
                      
                      return (
                        <div 
                          key={product.id} 
                          className="flex items-center justify-between p-4 bg-white hover:bg-blue-50 rounded-lg cursor-pointer transition-all duration-200 border border-gray-200 hover:border-blue-300 hover:shadow-md"
                          onClick={() => addProductToTransfer(product.id)}
                        >
                          <div className="flex items-center flex-1">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                              <Package className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Réf: {product.reference}</span>
                                {product.barcode && (
                                  <span className="font-mono">Code: {product.barcode}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center">
                              <div className="text-right mr-4">
                                <p className="text-lg font-bold text-green-600">{stockInStore}</p>
                                <p className="text-xs text-gray-500">{product.unit} disponible(s)</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addProductToTransfer(product.id);
                                }}
                                className="ml-2"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Ajouter
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Footer du modal */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {availableProducts.length} produit(s) disponible(s) pour le transfert
                    {productSearch && ` (recherche: "${productSearch}")`}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => setProductSearch('')}
                      disabled={!productSearch}
                    >
                      Effacer recherche
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setShowProductSelector(false);
                        setProductSearch('');
                      }}
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
};