import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Store,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  Building,
  Home
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
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
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Store as StoreType } from '../../types';

interface StoreManagementProps {
  readOnly?: boolean;
}

export const StoreManagement: React.FC<StoreManagementProps> = ({ readOnly = false }) => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    isMainStore: false,
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useAuthStore();

  // Charger les magasins
  const loadStores = async () => {
    if (!user?.establishmentId) return;

    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'stores'),
        where('establishmentId', '==', user.establishmentId)
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
    } catch (error) {
      console.error('Erreur lors du chargement des magasins:', error);
      toast.error('Erreur lors du chargement des magasins');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [user?.establishmentId]);

  const handleAddStore = () => {
    if (readOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour ajouter des magasins');
      return;
    }
    
    setEditingStore(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      isMainStore: stores.length === 0, // Premier magasin = magasin principal par défaut
      isActive: true
    });
    setErrors({});
    setShowForm(true);
  };

  const handleEditStore = (store: StoreType) => {
    if (readOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour modifier des magasins');
      return;
    }
    
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address,
      phone: store.phone || '',
      email: store.email || '',
      isMainStore: store.isMainStore,
      isActive: store.isActive
    });
    setErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du magasin est requis';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'L\'adresse est requise';
    }

    // Vérifier si le nom existe déjà (sauf pour le magasin en cours d'édition)
    const existingStore = stores.find(store => 
      store.name.toLowerCase() === formData.name.toLowerCase() && 
      store.id !== editingStore?.id
    );
    
    if (existingStore) {
      newErrors.name = 'Un magasin avec ce nom existe déjà';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.establishmentId) return;

    try {
      if (editingStore) {
        // Si on désactive le magasin principal, vérifier qu'il y a un autre magasin principal
        if (editingStore.isMainStore && !formData.isMainStore) {
          const otherMainStore = stores.find(s => s.id !== editingStore.id && s.isMainStore);
          if (!otherMainStore) {
            toast.error('Vous devez avoir au moins un magasin principal');
            return;
          }
        }

        // Si on change le magasin principal, mettre à jour les autres magasins
        if (!editingStore.isMainStore && formData.isMainStore) {
          // Mettre à jour tous les autres magasins pour qu'ils ne soient plus principaux
          for (const store of stores) {
            if (store.id !== editingStore.id && store.isMainStore) {
              await updateDoc(doc(db, 'stores', store.id), {
                isMainStore: false,
                updatedAt: Timestamp.now()
              });
            }
          }
        }

        // Modifier un magasin existant
        await updateDoc(doc(db, 'stores', editingStore.id), {
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          isMainStore: formData.isMainStore,
          isActive: formData.isActive,
          updatedAt: Timestamp.now()
        });
        toast.success('Magasin modifié avec succès');
      } else {
        // Si on crée un magasin principal, mettre à jour les autres magasins
        if (formData.isMainStore) {
          // Mettre à jour tous les autres magasins pour qu'ils ne soient plus principaux
          for (const store of stores) {
            if (store.isMainStore) {
              await updateDoc(doc(db, 'stores', store.id), {
                isMainStore: false,
                updatedAt: Timestamp.now()
              });
            }
          }
        }

        // Créer un nouveau magasin
        const storeId = `store_${Date.now()}`;
        await setDoc(doc(db, 'stores', storeId), {
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          establishmentId: user.establishmentId,
          isMainStore: formData.isMainStore,
          isActive: formData.isActive,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('Magasin créé avec succès');
      }

      await loadStores();
      setShowForm(false);
      setEditingStore(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (readOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour supprimer des magasins');
      return;
    }
    
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    // Vérifier si c'est le magasin principal
    if (store.isMainStore) {
      toast.error('Vous ne pouvez pas supprimer le magasin principal');
      return;
    }

    // TODO: Vérifier s'il y a des produits ou des ventes liés à ce magasin

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le magasin "${store.name}" ?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'stores', storeId));
      await loadStores();
      toast.success('Magasin supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement des magasins...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestion des Magasins</h2>
          <p className="text-gray-600 mt-1">
            Gérez vos différents points de vente et emplacements
          </p>
        </div>
        {!readOnly && (
          <Button onClick={handleAddStore}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau magasin
          </Button>
        )}
      </div>

      {readOnly && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Mode lecture seule</h4>
              <p className="text-sm text-yellow-700 mt-1">
                En tant que Lecteur, vous pouvez uniquement consulter les magasins mais pas les modifier.
                Contactez un administrateur si vous avez besoin de ces permissions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Explication */}
      <Card>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Building className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Gestion multi-magasins</h4>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• Créez plusieurs magasins ou points de vente pour votre établissement</p>
                <p>• Suivez le stock par magasin et effectuez des transferts entre eux</p>
                <p>• Désignez un magasin principal qui servira de référence</p>
                <p>• Chaque magasin peut avoir ses propres ventes et statistiques</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Liste des magasins */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <Card key={store.id} padding="md" className={store.isMainStore ? 'border-blue-300' : ''}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  store.isMainStore ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {store.isMainStore ? (
                    <Home className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Store className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center">
                    <h3 className="font-semibold text-gray-900">{store.name}</h3>
                    {store.isMainStore && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Principal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {store.address}
                  </div>
                  {store.phone && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Phone className="w-3 h-3 mr-1" />
                      {store.phone}
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Mail className="w-3 h-3 mr-1" />
                      {store.email}
                    </div>
                  )}
                </div>
              </div>
              {!readOnly && (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditStore(store)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {!store.isMainStore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStore(store.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  store.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {store.isActive ? 'Actif' : 'Inactif'}
                </span>
                <span className="text-xs text-gray-500">
                  Créé le {store.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>
        ))}

        {stores.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun magasin</h3>
            <p className="text-gray-500 mb-6">Créez votre premier magasin pour commencer à gérer vos points de vente</p>
            {!readOnly && (
              <Button onClick={handleAddStore}>
                <Plus className="w-4 h-4 mr-2" />
                Créer un magasin
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Formulaire de création/édition */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingStore ? 'Modifier le magasin' : 'Nouveau magasin'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nom du magasin *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                placeholder="Ex: Magasin Principal"
                leftIcon={<Store className="w-4 h-4" />}
              />

              <Input
                label="Adresse *"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                error={errors.address}
                placeholder="Ex: 123 Rue Principale, Antananarivo"
                leftIcon={<MapPin className="w-4 h-4" />}
              />

              <Input
                label="Téléphone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: +261 34 12 345 67"
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: magasin@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isMainStore"
                  checked={formData.isMainStore}
                  onChange={(e) => setFormData({ ...formData, isMainStore: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isMainStore" className="ml-2 text-sm text-gray-700">
                  Magasin principal
                </label>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Le magasin principal est le magasin de référence pour votre établissement.
              </p>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Magasin actif
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {editingStore ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};