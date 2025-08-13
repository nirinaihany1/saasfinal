import React, { useState, useEffect } from 'react';
import { SubscriptionPlans } from '../components/subscription/SubscriptionPlans';
import { SubscriptionStatus } from '../components/subscription/SubscriptionStatus';
import { PaymentRequestForm } from '../components/subscription/PaymentRequestForm';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Clock,
  History,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export const SubscriptionManagement: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { user } = useAuthStore();

  const planPrices: Record<string, number> = {
    starter: 15000,
    business: 35000,
    enterprise: 75000
  };

  // Charger les données d'abonnement
  const loadSubscriptionData = async () => {
    if (!user?.establishmentId) return;

    try {
      setLoadingData(true);

      // Charger l'abonnement actuel
      const subDoc = await getDoc(doc(db, 'subscriptions', `sub_${user.establishmentId}`));
      
      if (subDoc.exists()) {
        const subData = subDoc.data();
        setSubscription({
          ...subData,
          startDate: subData.startDate?.toDate(),
          endDate: subData.endDate?.toDate(),
          trialEndDate: subData.trialEndDate?.toDate(),
          lastPaymentDate: subData.lastPaymentDate?.toDate(),
          nextPaymentDate: subData.nextPaymentDate?.toDate(),
          daysLeft: Math.ceil((subData.endDate?.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        });
      } else {
        // Créer un abonnement d'essai par défaut
        const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const defaultSubscription = {
          id: `sub_${user.establishmentId}`,
          establishmentId: user.establishmentId,
          establishmentName: user.name || 'Mon Établissement',
          plan: 'trial',
          status: 'trial',
          startDate: new Date(),
          endDate: trialEndDate,
          trialEndDate: trialEndDate,
          monthlyPrice: 0,
          nextPaymentDate: trialEndDate,
          daysLeft: 14,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        setSubscription(defaultSubscription);
        
        // Sauvegarder dans Firestore
        await setDoc(doc(db, 'subscriptions', `sub_${user.establishmentId}`), {
          ...defaultSubscription,
          startDate: Timestamp.fromDate(defaultSubscription.startDate),
          endDate: Timestamp.fromDate(defaultSubscription.endDate),
          trialEndDate: Timestamp.fromDate(defaultSubscription.trialEndDate),
          nextPaymentDate: Timestamp.fromDate(defaultSubscription.nextPaymentDate),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      // Charger l'historique des paiements - Query simplifié pour éviter l'erreur d'index
      const paymentsQuery = query(
        collection(db, 'payment_requests'),
        where('establishmentId', '==', user.establishmentId)
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          submittedAt: data.submittedAt?.toDate(),
          processedAt: data.processedAt?.toDate()
        };
      });
      
      // Trier côté client par date de soumission (plus récent en premier)
      const sortedPayments = payments.sort((a, b) => {
        if (!a.submittedAt || !b.submittedAt) return 0;
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      });
      
      setPaymentHistory(sortedPayments);

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données d\'abonnement');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  // Configurer un écouteur en temps réel pour l'abonnement
  useEffect(() => {
    if (!user?.establishmentId) return;

    const subscriptionRef = doc(db, 'subscriptions', `sub_${user.establishmentId}`);
    
    // Configurer l'écouteur
    const unsubscribe = onSnapshot(subscriptionRef, (doc) => {
      if (doc.exists()) {
        const subData = doc.data();
        setSubscription({
          ...subData,
          startDate: subData.startDate?.toDate(),
          endDate: subData.endDate?.toDate(),
          trialEndDate: subData.trialEndDate?.toDate(),
          lastPaymentDate: subData.lastPaymentDate?.toDate(),
          nextPaymentDate: subData.nextPaymentDate?.toDate(),
          daysLeft: Math.ceil((subData.endDate?.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        });
      }
    }, (error) => {
      console.error("Erreur lors de l'écoute des changements d'abonnement:", error);
    });

    // Nettoyer l'écouteur lors du démontage du composant
    return () => unsubscribe();
  }, [user?.establishmentId]);

  // Charger les données initiales
  useEffect(() => {
    loadSubscriptionData();
  }, [user?.establishmentId]);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setShowPaymentForm(true);
  };

  const handlePaymentRequest = async (paymentData: any) => {
    if (!user?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    setIsLoading(true);
    
    try {
      // Créer la demande de paiement
      const paymentRequestId = `payment_${Date.now()}`;
      const paymentRequest = {
        id: paymentRequestId,
        subscriptionId: `sub_${user.establishmentId}`,
        establishmentId: user.establishmentId,
        establishmentName: subscription?.establishmentName || 'Mon Établissement',
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentReference: paymentData.paymentReference,
        status: 'pending',
        submittedAt: Timestamp.now(),
        notes: paymentData.notes,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'payment_requests', paymentRequestId), paymentRequest);

      // Mettre à jour l'abonnement avec le plan sélectionné
      if (selectedPlan) {
        // Calculer la nouvelle date de fin (30 jours à partir d'aujourd'hui ou à partir de la date de fin actuelle si elle est dans le futur)
        const currentEndDate = subscription.endDate;
        const now = new Date();
        const baseDate = currentEndDate > now ? currentEndDate : now;
        const newEndDate = new Date(baseDate);
        newEndDate.setDate(newEndDate.getDate() + 30); // Ajouter 30 jours

        await updateDoc(doc(db, 'subscriptions', `sub_${user.establishmentId}`), {
          plan: selectedPlan,
          status: 'pending_payment', // Mettre à "pending_payment" en attendant la validation
          endDate: Timestamp.fromDate(newEndDate),
          nextPaymentDate: Timestamp.fromDate(newEndDate),
          monthlyPrice: planPrices[selectedPlan],
          updatedAt: Timestamp.now()
        });

        // Recharger les données d'abonnement
        await loadSubscriptionData();
      }

      setShowPaymentForm(false);
      setSelectedPlan(null);
      
      toast.success('Demande de paiement envoyée avec succès !');
      toast('Votre demande sera traitée dans les prochaines heures.');
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = () => {
    setRefreshing(true);
    loadSubscriptionData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  if (loadingData) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement de votre abonnement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion de votre abonnement
          </h1>
          <p className="text-gray-600">
            Gérez votre abonnement Nirina Nirina Pos et accédez à toutes les fonctionnalités 
            pour développer votre business à Madagascar.
          </p>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleRefreshData} 
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Statut actuel */}
      {subscription && (
        <SubscriptionStatus 
          subscription={subscription}
          onUpgrade={() => setShowPaymentForm(true)}
        />
      )}

      {/* Notification de paiement en attente */}
      {subscription && subscription.status === 'pending_payment' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800">Paiement en attente de validation</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Votre demande de paiement pour le plan <strong>{selectedPlan || subscription.plan}</strong> est en cours de traitement.
                Votre abonnement sera activé dès que notre équipe aura validé votre paiement.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                Délai de traitement habituel : 2-4 heures ouvrables.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Historique des paiements */}
      {paymentHistory.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Historique des paiements
            </h3>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
          
          <div className="space-y-3">
            {paymentHistory.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {payment.paymentMethod} • {payment.paymentReference}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                    {getPaymentStatusLabel(payment.status)}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {payment.submittedAt?.toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Plans d'abonnement */}
      <SubscriptionPlans 
        onSelectPlan={handleSelectPlan}
        currentPlan={subscription?.plan}
      />

      {/* Informations de paiement */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💳 Méthodes de paiement acceptées
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">M</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">MVola</p>
              <p className="text-sm text-gray-600">Paiement mobile</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 font-bold text-sm">O</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Orange Money</p>
              <p className="text-sm text-gray-600">Paiement mobile</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">A</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Airtel Money</p>
              <p className="text-sm text-gray-600">Paiement mobile</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Virement bancaire</p>
              <p className="text-sm text-gray-600">BNI, BOA, BFV</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">💰</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Espèces</p>
              <p className="text-sm text-gray-600">Dépôt en agence</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Support */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🆘 Besoin d'aide ?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Contact Support</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>📧 Email: admin@saasmada.pro</p>
              <p>📱 WhatsApp: +261 32 46 118 07</p>
              <p>🕒 Lundi - Vendredi: 8h - 17h</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Questions fréquentes</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>• Comment changer de plan ?</p>
              <p>• Délai de validation des paiements</p>
              <p>• Remboursement et annulation</p>
              <p>• Formation et support technique</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Formulaire de paiement */}
      {showPaymentForm && (
        <PaymentRequestForm
          subscriptionId={`sub_${user?.establishmentId}`}
          amount={selectedPlan ? planPrices[selectedPlan] : subscription?.monthlyPrice || 0}
          onSubmit={handlePaymentRequest}
          onCancel={() => {
            setShowPaymentForm(false);
            setSelectedPlan(null);
          }}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};