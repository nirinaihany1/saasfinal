import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  ArrowRight, 
  Plus, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle,
  Package,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Store,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Input } from '../ui/Input';
import toast from 'react-hot-toast';
import { StockTransferForm } from './StockTransferForm';
import { StockTransfer } from '../../types';

interface StockTransferListProps {
  readOnly?: boolean;
}

export const StockTransferList: React.FC<StockTransferListProps> = ({ readOnly = false }) => {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [indexError, setIndexError] = useState(false);
  
  const { user } = useAuthStore();

  // Charger les transferts
  const loadTransfers = async () => {
    if (!user?.establishmentId) return;

    try {
      setIsLoading(true);
      setIndexError(false);
      
      try {
        // Essayer d'abord avec la requête complète
        const transfersQuery = query(
          collection(db, 'stock_transfers'),
          where('establishmentId', '==', user.establishmentId),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(transfersQuery);
        const transfersData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            establishmentId: data.establishmentId,
            sourceStoreId: data.sourceStoreId,
            sourceStoreName: data.sourceStoreName,
            destinationStoreId: data.destinationStoreId,
            destinationStoreName: data.destinationStoreName,
            items: data.items,
            status: data.status,
            notes: data.notes,
            createdById: data.createdById,
            createdByName: data.createdByName,
            completedById: data.completedById,
            completedByName: data.completedByName,
            createdAt: data.createdAt.toDate(),
            completedAt: data.completedAt?.toDate(),
            updatedAt: data.updatedAt.toDate()
          } as StockTransfer;
        });
        
        setTransfers(transfersData);
      } catch (error: any) {
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          setIndexError(true);
          console.warn('Index composite requis pour les transferts. Chargement des données alternatives...');
          
          // Fallback: charger tous les transferts de l'établissement et trier côté client
          const fallbackQuery = query(
            collection(db, 'stock_transfers'),
            where('establishmentId', '==', user.establishmentId)
          );
          
          const snapshot = await getDocs(fallbackQuery);
          const transfersData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              establishmentId: data.establishmentId,
              sourceStoreId: data.sourceStoreId,
              sourceStoreName: data.sourceStoreName,
              destinationStoreId: data.destinationStoreId,
              destinationStoreName: data.destinationStoreName,
              items: data.items,
              status: data.status,
              notes: data.notes,
              createdById: data.createdById,
              createdByName: data.createdByName,
              completedById: data.completedById,
              completedByName: data.completedByName,
              createdAt: data.createdAt.toDate(),
              completedAt: data.completedAt?.toDate(),
              updatedAt: data.updatedAt.toDate()
            } as StockTransfer;
          });
          
          // Trier par date de création (plus récent en premier)
          transfersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          setTransfers(transfersData);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des transferts:', error);
      toast.error('Erreur lors du chargement des transferts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [user?.establishmentId]);

  // Filtrer les transferts
  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = 
      transfer.sourceStoreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.destinationStoreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.createdByName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || transfer.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'completed': return 'Complété';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  // Afficher les détails d'un transfert
  const viewTransfer = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setShowForm(true);
  };

  // Créer un nouveau transfert
  const createTransfer = () => {
    setSelectedTransfer(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Transferts de Stock</h2>
          <p className="text-gray-600 mt-1">
            Gérez les mouvements de stock entre vos différents magasins
          </p>
        </div>
        {!readOnly && (
          <Button onClick={createTransfer}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau transfert
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
                En tant que Lecteur, vous pouvez uniquement consulter les transferts mais pas les modifier.
                Contactez un administrateur si vous avez besoin de ces permissions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filtres */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Rechercher par magasin ou créateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-5 h-5 text-gray-400" />}
            />
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="completed">Complétés</option>
            <option value="cancelled">Annulés</option>
          </select>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            {filteredTransfers.length} transfert(s) trouvé(s)
          </div>
          
          <Button variant="ghost" size="sm" onClick={loadTransfers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Liste des transferts */}
      {isLoading ? (
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement des transferts...</p>
          </div>
        </Card>
      ) : filteredTransfers.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun transfert trouvé</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedStatus !== 'all' 
                ? 'Aucun transfert ne correspond à vos critères de recherche' 
                : 'Commencez par créer votre premier transfert de stock'}
            </p>
            {!readOnly && (
              <Button onClick={createTransfer}>
                <Plus className="w-4 h-4 mr-2" />
                Créer un transfert
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTransfers.map((transfer) => (
            <Card key={transfer.id} padding="md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Store className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium text-gray-900">
                        {transfer.sourceStoreName}
                      </h3>
                      <ArrowRight className="mx-2 text-gray-400" />
                      <h3 className="font-medium text-gray-900">
                        {transfer.destinationStoreName}
                      </h3>
                    </div>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transfer.status)}`}>
                        {getStatusIcon(transfer.status)}
                        <span className="ml-1">{getStatusLabel(transfer.status)}</span>
                      </span>
                      <span className="text-sm text-gray-500">
                        {transfer.items.length} produit(s)
                      </span>
                    </div>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      Créé le {transfer.createdAt.toLocaleDateString()} par {transfer.createdByName}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewTransfer(transfer)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Détails
                  </Button>
                  
                  {transfer.status === 'pending' && !readOnly && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => viewTransfer(transfer)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Compléter
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Aperçu des produits */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-600 mb-2">Produits transférés:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {transfer.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center p-2 bg-gray-50 rounded-lg">
                      <Package className="w-4 h-4 text-gray-500 mr-2" />
                      <div className="flex-1 truncate">
                        <span className="font-medium text-gray-900">{item.productName}</span>
                        <span className="ml-2 text-gray-500">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                  {transfer.items.length > 3 && (
                    <div className="flex items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-500">
                        +{transfer.items.length - 3} autres produits
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Formulaire de transfert */}
      {showForm && (
        <StockTransferForm
          onClose={() => {
            setShowForm(false);
            setSelectedTransfer(null);
          }}
          onSuccess={loadTransfers}
          existingTransfer={selectedTransfer}
        />
      )}
    </div>
  );
};