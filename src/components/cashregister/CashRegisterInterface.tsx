import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  DollarSign, 
  CreditCard, 
  Plus, 
  Minus, 
  Calculator,
  Printer,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  Receipt,
  Calendar,
  BarChart3,
  Eye,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Wallet,
  Banknote,
  Store,
  Building
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { StoreSelector } from '../ui/StoreSelector';

interface CashMovement {
  id: string;
  type: 'sale' | 'expense' | 'adjustment' | 'withdrawal' | 'opening' | 'reset';
  amount: number;
  description: string;
  paymentMethod: string;
  time: string;
  date: Date;
  category?: string;
}

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
  expensesCount: number;
}

interface CashRegisterProps {
  isOpen: boolean;
  onToggleRegister: () => void;
}

export const CashRegisterInterface: React.FC<CashRegisterProps> = ({
  isOpen,
  onToggleRegister
}) => {
  const [openingAmount, setOpeningAmount] = useState(100000);
  const [currentCash, setCurrentCash] = useState(245500);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedView, setSelectedView] = useState('summary'); // 'summary', 'movements', 'analysis'
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    salesCount: 0,
    expensesCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [stores, setStores] = useState<any[]>([]);

  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'reader';

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
        };
      });

      setStores(storesData);
      
      // Sélectionner le magasin principal par défaut
      const mainStore = storesData.find(store => store.isMainStore);
      if (mainStore) {
        setSelectedStore(mainStore.id);
      } else if (storesData.length > 0) {
        setSelectedStore(storesData[0].id);
      }
      
      // Si aucun magasin n'est sélectionné et qu'il y a plus d'un magasin, afficher le sélecteur
      if (storesData.length > 1 && !isOpen) {
        setShowStoreSelector(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des magasins:', error);
    }
  };

  // Charger les données financières avec gestion d'erreur améliorée
  const loadFinancialData = async () => {
    if (!user?.establishmentId || !selectedStore) return;

    setIsLoading(true);
    try {
      const { startDate, endDate } = getPeriodDates(selectedPeriod);

      // Stratégie de requête simplifiée pour éviter les erreurs d'index
      // Charger les ventes avec une requête simplifiée
      let salesData: any[] = [];
      try {
        // Essayer d'abord avec la requête complète
        const salesQuery = query(
          collection(db, 'sales'),
          where('establishmentId', '==', user.establishmentId),
          where('storeId', '==', selectedStore),
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('createdAt', '<=', Timestamp.fromDate(endDate)),
          where('status', '==', 'completed'),
          orderBy('createdAt', 'desc')
        );

        const salesSnapshot = await getDocs(salesQuery);
        salesData = salesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'sale' as const,
            amount: data.total,
            description: `Vente ${data.receiptNumber}`,
            paymentMethod: data.paymentMethod,
            time: data.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            date: data.createdAt.toDate(),
            category: 'Vente'
          };
        });
      } catch (indexError) {
        console.warn('Index composite non disponible, utilisation d\'une requête simplifiée pour les ventes');
        
        // Requête de fallback sans orderBy
        const simpleSalesQuery = query(
          collection(db, 'sales'),
          where('establishmentId', '==', user.establishmentId),
          where('storeId', '==', selectedStore),
          where('status', '==', 'completed')
        );

        const salesSnapshot = await getDocs(simpleSalesQuery);
        salesData = salesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt.toDate();
            
            // Filtrer côté client
            if (createdAt >= startDate && createdAt <= endDate) {
              return {
                id: doc.id,
                type: 'sale' as const,
                amount: data.total,
                description: `Vente ${data.receiptNumber}`,
                paymentMethod: data.paymentMethod,
                time: createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                date: createdAt,
                category: 'Vente'
              };
            }
            return null;
          })
          .filter(Boolean)
          .sort((a, b) => b!.date.getTime() - a!.date.getTime());
      }

      // Charger les dépenses avec une stratégie similaire
      let expensesData: any[] = [];
      try {
        // Essayer d'abord avec la requête complète
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('establishmentId', '==', user.establishmentId),
          where('storeId', '==', selectedStore),
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('createdAt', '<=', Timestamp.fromDate(endDate)),
          where('status', '==', 'paid'),
          orderBy('createdAt', 'desc')
        );

        const expensesSnapshot = await getDocs(expensesQuery);
        expensesData = expensesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'expense' as const,
            amount: -data.amount, // Négatif pour les dépenses
            description: data.title,
            paymentMethod: data.paymentMethod,
            time: data.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            date: data.createdAt.toDate(),
            category: data.categoryName
          };
        });
      } catch (indexError) {
        console.warn('Index composite non disponible, utilisation d\'une requête simplifiée pour les dépenses');
        
        // Requête de fallback sans orderBy
        const simpleExpensesQuery = query(
          collection(db, 'expenses'),
          where('establishmentId', '==', user.establishmentId),
          where('storeId', '==', selectedStore),
          where('status', '==', 'paid')
        );

        const expensesSnapshot = await getDocs(simpleExpensesQuery);
        expensesData = expensesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt.toDate();
            
            // Filtrer côté client
            if (createdAt >= startDate && createdAt <= endDate) {
              return {
                id: doc.id,
                type: 'expense' as const,
                amount: -data.amount, // Négatif pour les dépenses
                description: data.title,
                paymentMethod: data.paymentMethod,
                time: createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                date: createdAt,
                category: data.categoryName
              };
            }
            return null;
          })
          .filter(Boolean)
          .sort((a, b) => b!.date.getTime() - a!.date.getTime());
      }

      // Charger l'état de la caisse pour le magasin sélectionné
      try {
        const cashRegisterRef = doc(db, 'cash_registers', `${user.establishmentId}_${selectedStore}`);
        const cashRegisterDoc = await getDoc(cashRegisterRef);
        
        if (cashRegisterDoc.exists()) {
          const data = cashRegisterDoc.data();
          if (data.status === 'open') {
            setCurrentCash(data.currentAmount || 0);
            setOpeningAmount(data.openingAmount || 0);
          } else {
            setCurrentCash(0);
            setOpeningAmount(100000);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'état de la caisse:', error);
      }

      // Combiner et trier par date
      const allMovements = [...salesData, ...expensesData].sort((a, b) => b.date.getTime() - a.date.getTime());
      setMovements(allMovements);

      // Calculer le résumé financier
      const totalRevenue = salesData.reduce((sum, sale) => sum + sale.amount, 0);
      const totalExpenses = Math.abs(expensesData.reduce((sum, expense) => sum + expense.amount, 0));
      const netProfit = totalRevenue - totalExpenses;

      setFinancialSummary({
        totalRevenue,
        totalExpenses,
        netProfit,
        salesCount: salesData.length,
        expensesCount: expensesData.length
      });

    } catch (error) {
      console.error('Erreur lors du chargement des données financières:', error);
      toast.error('Erreur lors du chargement des données. Veuillez créer les index Firestore requis.');
      
      // Afficher un message d'aide pour l'utilisateur
      toast.error(
        'Pour résoudre ce problème, créez les index composites dans la console Firebase.',
        { duration: 8000 }
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [user?.establishmentId]);

  useEffect(() => {
    if (selectedStore) {
      loadFinancialData();
    }
  }, [selectedPeriod, selectedStore, user?.establishmentId]);

  const getPeriodDates = (period: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
        endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }

    return { startDate, endDate };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      today: 'Aujourd\'hui',
      yesterday: 'Hier',
      week: 'Cette semaine',
      month: 'Ce mois',
      year: 'Cette année'
    };
    return labels[period] || period;
  };

  const handleOpenRegister = async () => {
    if (!selectedStore) {
      toast.error('Veuillez sélectionner un magasin');
      return;
    }

    if (openingAmount <= 0) {
      toast.error('Le montant d\'ouverture doit être supérieur à 0');
      return;
    }

    if (!user?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    try {
      const newMovement: CashMovement = {
        id: `mov_${Date.now()}`,
        type: 'opening',
        amount: openingAmount,
        description: 'Ouverture de caisse',
        paymentMethod: 'cash',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: new Date()
      };

      setMovements([newMovement, ...movements]);
      setCurrentCash(openingAmount);

      // Enregistrer l'état de la caisse dans Firestore
      const cashRegisterId = `${user.establishmentId}_${selectedStore}`;
      await setDoc(doc(db, 'cash_registers', cashRegisterId), {
        id: cashRegisterId,
        establishmentId: user.establishmentId,
        storeId: selectedStore,
        cashierId: user.id,
        cashierName: user.name,
        openingAmount: openingAmount,
        currentAmount: openingAmount,
        openedAt: Timestamp.now(),
        status: 'open',
        movements: [
          {
            id: newMovement.id,
            type: newMovement.type,
            amount: newMovement.amount,
            description: newMovement.description,
            paymentMethod: newMovement.paymentMethod,
            createdAt: Timestamp.now()
          }
        ]
      });

      onToggleRegister();
      toast.success('Caisse ouverte avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la caisse:', error);
      toast.error('Erreur lors de l\'ouverture de la caisse');
    }
  };

  const handleCloseRegister = async () => {
    if (!user?.establishmentId || !selectedStore) {
      toast.error('Informations manquantes');
      return;
    }

    try {
      const expectedAmount = currentCash;
      
      // Mettre à jour l'état de la caisse dans Firestore
      const cashRegisterId = `${user.establishmentId}_${selectedStore}`;
      await setDoc(doc(db, 'cash_registers', cashRegisterId), {
        status: 'closed',
        closingAmount: expectedAmount,
        closedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }, { merge: true });

      toast.success(`Caisse fermée. Total: ${formatCurrency(expectedAmount)}`);
      onToggleRegister();
    } catch (error) {
      console.error('Erreur lors de la fermeture de la caisse:', error);
      toast.error('Erreur lors de la fermeture de la caisse');
    }
  };

  const handleAdjustment = () => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour ajuster les fonds');
      return;
    }
    
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error('Montant invalide');
      return;
    }

    if (!adjustmentReason.trim()) {
      toast.error('Raison requise');
      return;
    }

    const newMovement: CashMovement = {
      id: `mov_${Date.now()}`,
      type: 'adjustment',
      amount,
      description: adjustmentReason,
      paymentMethod: 'cash',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date()
    };

    setMovements([newMovement, ...movements]);
    setCurrentCash(prev => prev + amount);
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setShowAdjustment(false);
    
    toast.success(amount > 0 ? 'Fonds ajoutés' : 'Fonds retirés');
  };

  const handleWithdrawal = (amount: number) => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour effectuer des retraits');
      return;
    }
    
    if (amount > currentCash) {
      toast.error('Fonds insuffisants en caisse');
      return;
    }

    const newMovement: CashMovement = {
      id: `mov_${Date.now()}`,
      type: 'withdrawal',
      amount: -amount,
      description: `Retrait de ${formatCurrency(amount)}`,
      paymentMethod: 'cash',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date()
    };

    setMovements([newMovement, ...movements]);
    setCurrentCash(prev => prev - amount);
    toast.success('Retrait effectué');
  };

  const handleResetBalance = () => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour réinitialiser la caisse');
      return;
    }
    
    if (!resetReason.trim()) {
      toast.error('Veuillez indiquer une raison pour la réinitialisation');
      return;
    }

    // Créer un mouvement de réinitialisation pour l'historique
    const resetMovement: CashMovement = {
      id: `mov_${Date.now()}`,
      type: 'reset',
      amount: -currentCash, // Montant négatif pour annuler le solde actuel
      description: `Réinitialisation de caisse: ${resetReason}`,
      paymentMethod: 'system',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date()
    };

    // Ajouter le mouvement à l'historique
    setMovements([resetMovement, ...movements]);
    
    // Réinitialiser les soldes
    setCurrentCash(0);
    
    // Fermer le modal et réinitialiser le champ de raison
    setShowResetConfirmation(false);
    setResetReason('');
    
    toast.success('Solde de caisse réinitialisé avec succès');
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'expense': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'adjustment': return <Calculator className="w-4 h-4 text-blue-600" />;
      case 'withdrawal': return <Minus className="w-4 h-4 text-orange-600" />;
      case 'opening': return <Unlock className="w-4 h-4 text-purple-600" />;
      case 'reset': return <RefreshCw className="w-4 h-4 text-red-600" />;
      default: return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementColor = (amount: number) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const exportFinancialReport = () => {
    const csvContent = [
      ['Type', 'Description', 'Catégorie', 'Montant', 'Méthode', 'Date', 'Heure'],
      ...movements.map(m => [
        m.type === 'sale' ? 'Recette' : 
        m.type === 'expense' ? 'Dépense' : 
        m.type === 'adjustment' ? 'Ajustement' : 
        m.type === 'withdrawal' ? 'Retrait' : 
        m.type === 'opening' ? 'Ouverture' : 
        m.type === 'reset' ? 'Réinitialisation' : m.type,
        m.description,
        m.category || '',
        Math.abs(m.amount),
        m.paymentMethod,
        m.date.toLocaleDateString('fr-FR'),
        m.time
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_financier_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Rapport exporté avec succès');
  };

  const renderFinancialSummary = () => (
    <div className="space-y-6">
      {/* Message d'information sur les index */}
      {movements.length === 0 && !isLoading && (
        <Card padding="md" className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Calendar className="w-5 h-5 text-yellow-600 mt-0.5" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Configuration requise</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Pour afficher les données financières complètes, veuillez créer les index composites Firestore requis dans votre console Firebase.
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                Les données locales de la caisse restent disponibles.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Résumé financier principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card padding="md" className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-500 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700">Recettes totales</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(financialSummary.totalRevenue)}</p>
              <p className="text-xs text-green-600">{financialSummary.salesCount} vente(s)</p>
            </div>
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-500 rounded-lg">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-700">Dépenses totales</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(financialSummary.totalExpenses)}</p>
              <p className="text-xs text-red-600">{financialSummary.expensesCount} dépense(s)</p>
            </div>
          </div>
        </Card>

        <Card padding="md" className={`bg-gradient-to-br ${
          currentCash >= 0 
            ? 'from-blue-50 to-blue-100 border-blue-200' 
            : 'from-orange-50 to-orange-100 border-orange-200'
        }`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${
              currentCash >= 0 ? 'bg-blue-500' : 'bg-orange-500'
            }`}>
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${
                currentCash >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}>
                Solde de caisse
              </p>
              <p className={`text-2xl font-bold ${
                currentCash >= 0 ? 'text-blue-900' : 'text-orange-900'
              }`}>
                {formatCurrency(currentCash)}
              </p>
              <p className={`text-xs ${
                currentCash >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                Montant disponible
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Graphique simple des tendances */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition financière</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-700">Recettes</span>
              <span className="text-sm text-green-600">{formatCurrency(financialSummary.totalRevenue)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: financialSummary.totalRevenue > 0 
                    ? `${(financialSummary.totalRevenue / (financialSummary.totalRevenue + financialSummary.totalExpenses)) * 100}%`
                    : '0%'
                }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-red-700">Dépenses</span>
              <span className="text-sm text-red-600">{formatCurrency(financialSummary.totalExpenses)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-red-500 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: financialSummary.totalExpenses > 0 
                    ? `${(financialSummary.totalExpenses / (financialSummary.totalRevenue + financialSummary.totalExpenses)) * 100}%`
                    : '0%'
                }}
              ></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderMovementsList = () => (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Mouvements financiers - {getPeriodLabel(selectedPeriod)}
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {movements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun mouvement pour cette période</p>
            <p className="text-sm mt-2">Les données Firestore nécessitent la création d'index composites</p>
          </div>
        ) : (
          movements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                {getMovementIcon(movement.type)}
                <div>
                  <p className="font-medium text-sm">{movement.description}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{movement.paymentMethod}</span>
                    <span>•</span>
                    <span>{movement.time}</span>
                    {movement.category && (
                      <>
                        <span>•</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {movement.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${getMovementColor(movement.amount)}`}>
                  {movement.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(movement.amount))}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  if (!isOpen) {
    return (
      <Card className="max-w-md mx-auto" padding="lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Ouverture de Caisse</h2>
          <p className="text-gray-600 mt-2">Sélectionnez un magasin et saisissez le montant d'ouverture</p>
        </div>

        <div className="space-y-4">
          {/* Sélecteur de magasin */}
          {stores.length > 0 ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Magasin *
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un magasin</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name} {store.isMainStore ? '(Principal)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Aucun magasin disponible</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Veuillez créer au moins un magasin dans la section "Magasins" avant d'ouvrir une caisse.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Input
            label="Montant d'ouverture (Ar)"
            type="number"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(Number(e.target.value))}
            leftIcon={<DollarSign className="w-4 h-4" />}
            placeholder="100000"
          />

          <Button 
            fullWidth 
            onClick={handleOpenRegister}
            disabled={!selectedStore || stores.length === 0}
          >
            <Unlock className="w-4 h-4 mr-2" />
            Ouvrir la caisse
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec sélecteur de période et magasin */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className={`w-4 h-4 rounded-full bg-green-500`}></div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion Financière</h1>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Caisse ouverte
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Sélecteur de magasin */}
          <div className="flex items-center bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
            <Store className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">
              {stores.find(s => s.id === selectedStore)?.name || 'Magasin'}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2 text-blue-600 hover:bg-blue-100 p-1"
              onClick={() => setShowStoreSelector(true)}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today">Aujourd'hui</option>
            <option value="yesterday">Hier</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          
          <Button variant="ghost" onClick={exportFinancialReport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Navigation des vues */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setSelectedView('summary')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedView === 'summary'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Résumé
        </button>
        <button
          onClick={() => setSelectedView('movements')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedView === 'movements'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Receipt className="w-4 h-4 inline mr-2" />
          Mouvements
        </button>
      </div>

      {/* Contenu selon la vue sélectionnée */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement des données financières...</p>
        </div>
      ) : (
        <>
          {selectedView === 'summary' && renderFinancialSummary()}
          {selectedView === 'movements' && renderMovementsList()}
        </>
      )}

      {/* Actions de caisse (toujours visibles) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">État de la caisse</h3>
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 mb-4">
            <div className="flex items-center justify-center">
              <Wallet className="w-10 h-10 text-blue-600 mr-4" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Solde actuel</p>
                <p className="text-3xl font-bold text-blue-900">{formatCurrency(currentCash)}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Banknote className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-sm font-medium">Espèces en caisse</p>
            </div>
            <p className="font-semibold">{formatCurrency(currentCash)}</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="space-y-3">
            {!isReadOnly && (
              <>
                <Button 
                  fullWidth 
                  variant="success"
                  onClick={() => setShowAdjustment(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajuster fonds
                </Button>
                
                <Button 
                  fullWidth 
                  variant="warning"
                  onClick={() => handleWithdrawal(50000)}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Retrait rapide (50,000 Ar)
                </Button>
                
                <Button 
                  fullWidth 
                  variant="ghost"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer rapport
                </Button>
                
                <Button 
                  fullWidth 
                  variant="danger"
                  onClick={() => setShowResetConfirmation(true)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réinitialiser solde
                </Button>
              </>
            )}
            
            <Button 
              fullWidth 
              variant="danger"
              onClick={handleCloseRegister}
            >
              <Lock className="w-4 h-4 mr-2" />
              Fermer caisse
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal d'ajustement */}
      {showAdjustment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajustement de caisse</h3>
            
            <div className="space-y-4">
              <Input
                label="Montant (Ar)"
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="Montant positif ou négatif"
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raison de l'ajustement
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Erreur de caisse, monnaie rendue incorrecte..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowAdjustment(false)}>
                Annuler
              </Button>
              <Button onClick={handleAdjustment}>
                Confirmer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de réinitialisation de mot de passe */}
      {showResetConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Réinitialiser le solde de caisse</h3>
              <p className="text-gray-600 mt-2">
                Cette action va remettre à zéro le solde de la caisse. Cette opération est irréversible.
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Attention</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Le solde actuel de {formatCurrency(currentCash)} sera remis à zéro.
                    Un mouvement de caisse sera enregistré pour tracer cette opération.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raison de la réinitialisation *
                </label>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Clôture de journée, correction d'erreur..."
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowResetConfirmation(false)}>
                Annuler
              </Button>
              <Button 
                variant="danger" 
                onClick={handleResetBalance}
                disabled={!resetReason.trim()}
              >
                Réinitialiser
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de sélection de magasin */}
      {showStoreSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md" padding="lg">
            <StoreSelector 
              onStoreSelect={(storeId) => {
                setSelectedStore(storeId);
                setShowStoreSelector(false);
                loadFinancialData();
              }}
              selectedStore={selectedStore}
              onClose={() => setShowStoreSelector(false)}
            />
          </Card>
        </div>
      )}
    </div>
  );
};