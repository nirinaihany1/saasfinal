import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Download,
  Filter,
  Search,
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  X,
  CreditCard,
  Smartphone,
  Building,
  Banknote,
  FileText
} from 'lucide-react';
import { PaymentRequest } from '../../types/subscription';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  updateDoc,
  doc,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

// Composant pour afficher les détails d'une demande de paiement
const PaymentRequestDetails: React.FC<{
  request: PaymentRequest;
  onClose: () => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}> = ({ request, onClose, onApprove, onReject }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'mvola': return <Smartphone className="w-5 h-5 text-red-600" />;
      case 'orange_money': return <Smartphone className="w-5 h-5 text-orange-600" />;
      case 'airtel_money': return <Smartphone className="w-5 h-5 text-red-600" />;
      case 'bank_transfer': return <Building className="w-5 h-5 text-blue-600" />;
      case 'cash': return <Banknote className="w-5 h-5 text-green-600" />;
      default: return <CreditCard className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      mvola: 'MVola',
      orange_money: 'Orange Money',
      airtel_money: 'Airtel Money',
      bank_transfer: 'Virement bancaire',
      cash: 'Espèces'
    };
    return labels[method] || method;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" padding="none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            Détails de la demande de paiement
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Établissement</p>
                  <p className="font-semibold text-gray-900">{request.establishmentName}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Date de soumission</p>
                  <p className="font-semibold text-gray-900">
                    {request.submittedAt.toLocaleDateString('fr-FR')} à {request.submittedAt.toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Montant</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(request.amount)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="mr-3">
                  {getPaymentMethodIcon(request.paymentMethod)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Méthode de paiement</p>
                  <p className="font-semibold text-gray-900">{getPaymentMethodLabel(request.paymentMethod)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Référence de paiement */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Référence de paiement</h3>
            <p className="font-mono text-lg text-gray-800 bg-white p-3 rounded border">
              {request.paymentReference}
            </p>
          </div>

          {/* Notes */}
          {request.notes && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700">{request.notes}</p>
              </div>
            </div>
          )}

          {/* Statut */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Statut de la demande</p>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                {getStatusLabel(request.status)}
              </span>
            </div>
            
            {request.processedAt && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Traité le</p>
                <p className="font-medium text-gray-900">
                  {request.processedAt.toLocaleDateString('fr-FR')}
                </p>
                {request.processedBy && (
                  <p className="text-sm text-gray-500">par {request.processedBy}</p>
                )}
              </div>
            )}
          </div>

          {/* Instructions selon la méthode de paiement */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Instructions de vérification</h4>
            <div className="text-sm text-yellow-700">
              {request.paymentMethod === 'mvola' && (
                <p>Vérifiez la transaction MVola avec la référence fournie dans votre historique des transactions.</p>
              )}
              {request.paymentMethod === 'orange_money' && (
                <p>Vérifiez la transaction Orange Money avec la référence fournie dans votre historique des transactions.</p>
              )}
              {request.paymentMethod === 'airtel_money' && (
                <p>Vérifiez la transaction Airtel Money avec la référence fournie dans votre historique des transactions.</p>
              )}
              {request.paymentMethod === 'bank_transfer' && (
                <p>Vérifiez le virement bancaire dans votre compte avec la référence fournie.</p>
              )}
              {request.paymentMethod === 'cash' && (
                <p>Vérifiez le dépôt d'espèces avec la référence fournie auprès de votre agence.</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 p-6 border-t border-gray-200">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          
          {request.status === 'pending' && (
            <div className="flex gap-3">
              <Button 
                variant="danger" 
                onClick={() => {
                  onReject(request.id);
                  onClose();
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
              <Button 
                variant="success" 
                onClick={() => {
                  onApprove(request.id);
                  onClose();
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approuver
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export const PaymentValidationDashboard: React.FC = () => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { user } = useAuthStore();

  // Charger les demandes de paiement
  const loadPaymentRequests = async () => {
    try {
      setIsLoading(true);
      
      // Requête simplifiée pour éviter l'erreur d'index composite
      let q;
      if (selectedStatus === 'all') {
        q = query(collection(db, 'payment_requests'));
      } else {
        q = query(
          collection(db, 'payment_requests'),
          where('status', '==', selectedStatus)
        );
      }

      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          submittedAt: data.submittedAt?.toDate() || new Date(),
          processedAt: data.processedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as PaymentRequest;
      });

      // Trier côté client par date de soumission (plus récent en premier)
      const sortedRequests = requests.sort((a, b) => {
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      });

      setPaymentRequests(sortedRequests);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadPaymentRequests();
    }
  }, [selectedStatus, user]);

  const handleApprovePayment = async (requestId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir approuver ce paiement ?')) {
      return;
    }

    try {
      // 1. Récupérer les détails de la demande de paiement
      const paymentRequest = paymentRequests.find(req => req.id === requestId);
      if (!paymentRequest) {
        toast.error('Demande de paiement non trouvée');
        return;
      }

      // 2. Mettre à jour le statut de la demande de paiement
      await updateDoc(doc(db, 'payment_requests', requestId), {
        status: 'approved',
        processedAt: Timestamp.now(),
        processedBy: user?.name || 'Admin'
      });

      // 3. Mettre à jour l'abonnement correspondant
      const subscriptionId = paymentRequest.subscriptionId;
      const subscriptionDoc = await getDoc(doc(db, 'subscriptions', subscriptionId));
      
      if (subscriptionDoc.exists()) {
        const subscriptionData = subscriptionDoc.data();
        
        // Calculer la nouvelle date de fin (30 jours à partir d'aujourd'hui ou à partir de la date de fin actuelle si elle est dans le futur)
        const currentEndDate = subscriptionData.endDate?.toDate() || new Date();
        const now = new Date();
        const baseDate = currentEndDate > now ? currentEndDate : now;
        const newEndDate = new Date(baseDate);
        newEndDate.setDate(newEndDate.getDate() + 30); // Ajouter 30 jours

        // Mettre à jour l'abonnement
        await updateDoc(doc(db, 'subscriptions', subscriptionId), {
          status: 'active', // Activer l'abonnement
          endDate: Timestamp.fromDate(newEndDate),
          nextPaymentDate: Timestamp.fromDate(newEndDate),
          lastPaymentDate: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      await loadPaymentRequests();
      toast.success('Paiement approuvé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleRejectPayment = async (requestId: string, reason?: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir rejeter ce paiement ?')) {
      return;
    }

    try {
      // 1. Récupérer les détails de la demande de paiement
      const paymentRequest = paymentRequests.find(req => req.id === requestId);
      if (!paymentRequest) {
        toast.error('Demande de paiement non trouvée');
        return;
      }

      // 2. Mettre à jour le statut de la demande de paiement
      await updateDoc(doc(db, 'payment_requests', requestId), {
        status: 'rejected',
        processedAt: Timestamp.now(),
        processedBy: user?.name || 'Admin',
        notes: reason || 'Paiement rejeté par l\'administrateur'
      });

      // 3. Si l'abonnement était en attente de paiement, le remettre en état précédent
      const subscriptionId = paymentRequest.subscriptionId;
      const subscriptionDoc = await getDoc(doc(db, 'subscriptions', subscriptionId));
      
      if (subscriptionDoc.exists()) {
        const subscriptionData = subscriptionDoc.data();
        
        if (subscriptionData.status === 'pending_payment') {
          // Remettre l'abonnement dans son état précédent
          await updateDoc(doc(db, 'subscriptions', subscriptionId), {
            status: subscriptionData.endDate?.toDate() < new Date() ? 'expired' : 'active',
            updatedAt: Timestamp.now()
          });
        }
      }

      await loadPaymentRequests();
      toast.success('Paiement rejeté');
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      toast.error('Erreur lors du rejet');
    }
  };

  const handleViewDetails = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      mvola: 'MVola',
      orange_money: 'Orange Money',
      airtel_money: 'Airtel Money',
      bank_transfer: 'Virement bancaire',
      cash: 'Espèces'
    };
    return labels[method] || method;
  };

  const filteredRequests = paymentRequests.filter(request =>
    request.establishmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.paymentReference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    pending: paymentRequests.filter(r => r.status === 'pending').length,
    approved: paymentRequests.filter(r => r.status === 'approved').length,
    rejected: paymentRequests.filter(r => r.status === 'rejected').length,
    totalAmount: paymentRequests
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0)
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-600">Seuls les administrateurs peuvent accéder à cette section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Validation des paiements</h1>
          <p className="text-gray-600 mt-1">
            Gérez les demandes de paiement des abonnements clients
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approuvés</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejetés</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Montant en attente</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par établissement ou référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
          </select>
        </div>
      </Card>

      {/* Liste des demandes */}
      <Card>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement des demandes...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande trouvée</h3>
            <p className="text-gray-500">Aucune demande de paiement ne correspond à vos critères</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Établissement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Méthode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-8 h-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.establishmentName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {request.establishmentId.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(request.amount)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {getPaymentMethodLabel(request.paymentMethod)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">
                        {request.paymentReference}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.submittedAt.toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.submittedAt.toLocaleTimeString('fr-FR')}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status === 'pending' ? 'En attente' :
                           request.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {request.status === 'pending' && (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleApprovePayment(request.id)}
                              title="Approuver"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRejectPayment(request.id)}
                              title="Rejeter"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal des détails */}
      {showDetails && selectedRequest && (
        <PaymentRequestDetails
          request={selectedRequest}
          onClose={() => {
            setShowDetails(false);
            setSelectedRequest(null);
          }}
          onApprove={handleApprovePayment}
          onReject={handleRejectPayment}
        />
      )}
    </div>
  );
};