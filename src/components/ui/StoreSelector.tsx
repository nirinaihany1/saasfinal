import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Store, Building, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Store as StoreType } from '../../types';

interface StoreSelectorProps {
  onStoreSelect: (storeId: string) => void;
  selectedStore?: string;
  onClose?: () => void;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  onStoreSelect,
  selectedStore,
  onClose
}) => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadStores = async () => {
      if (!user?.establishmentId) return;

      try {
        setIsLoading(true);
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
        
        // Sélectionner automatiquement le magasin principal s'il n'y a pas de magasin sélectionné
        if (!selectedStore && storesData.length > 0) {
          const mainStore = storesData.find(store => store.isMainStore);
          if (mainStore) {
            onStoreSelect(mainStore.id);
          } else {
            onStoreSelect(storesData[0].id);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des magasins:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStores();
  }, [user?.establishmentId, selectedStore, onStoreSelect]);

  const handleStoreSelect = (storeId: string) => {
    onStoreSelect(storeId);
    if (onClose) {
      onClose();
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement des magasins...</p>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="text-center p-4">
        <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Aucun magasin disponible</p>
        <p className="text-sm text-gray-500 mt-1">Créez d'abord un magasin dans les paramètres</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <Building className="w-5 h-5 mr-2 text-blue-600" />
        Sélectionner un magasin
      </h3>
      
      <div className="space-y-3">
        {stores.map(store => (
          <button
            key={store.id}
            onClick={() => handleStoreSelect(store.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
              selectedStore === store.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                store.isMainStore ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Store className={`w-5 h-5 ${
                  store.isMainStore ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              <div className="ml-3 text-left">
                <p className="font-medium text-gray-900">{store.name}</p>
                <p className="text-sm text-gray-500">{store.address}</p>
                {store.isMainStore && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mt-1">
                    Magasin principal
                  </span>
                )}
              </div>
            </div>
            {selectedStore === store.id && (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
      
      {onClose && (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>
      )}
    </div>
  );
};