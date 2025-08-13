import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ExpenseFilters } from '../components/expenses/ExpenseFilters';
import { ExpenseTable } from '../components/expenses/ExpenseTable';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExpenseCategoryManager } from '../components/expenses/ExpenseCategoryManager';
import { Plus, Settings, TrendingDown, BarChart3, AlertTriangle, Eye, DollarSign, X, Repeat } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  paymentMethod: string;
  supplier?: string;
  invoiceNumber?: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  nextDueDate?: Date;
  establishmentId: string;
  userId: string;
  userName: string;
  status: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'reader';

  // Charger les dépenses depuis Firebase
  const loadExpenses = async () => {
    if (!user?.establishmentId) return;

    try {
      setLoadingData(true);
      const q = query(
        collection(db, 'expenses'),
        where('establishmentId', '==', user.establishmentId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const expensesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          amount: data.amount,
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          paymentMethod: data.paymentMethod,
          supplier: data.supplier,
          invoiceNumber: data.invoiceNumber,
          isRecurring: data.isRecurring || false,
          recurringFrequency: data.recurringFrequency,
          nextDueDate: data.nextDueDate?.toDate(),
          establishmentId: data.establishmentId,
          userId: data.userId,
          userName: data.userName,
          status: data.status,
          paidAt: data.paidAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Expense;
      });

      setExpenses(expensesData);
    } catch (error) {
      console.error('Erreur lors du chargement des dépenses:', error);
      toast.error('Erreur lors du chargement des dépenses');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [user?.establishmentId]);

  // Filter expenses based on search and filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = 
        expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.supplier && expense.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || expense.categoryId === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || expense.status === selectedStatus;
      const matchesPayment = selectedPaymentMethod === 'all' || expense.paymentMethod === selectedPaymentMethod;

      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        const expenseDate = expense.paidAt || expense.createdAt;
        const expenseDateStr = expenseDate.toISOString().split('T')[0];
        matchesDate = expenseDateStr >= dateRange.start && expenseDateStr <= dateRange.end;
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesPayment && matchesDate;
    });
  }, [expenses, searchTerm, selectedCategory, selectedStatus, selectedPaymentMethod, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthExpenses = expenses.filter(e => {
      const expenseDate = e.paidAt || e.createdAt;
      return expenseDate >= thisMonth && e.status === 'paid';
    });
    
    const pendingExpenses = expenses.filter(e => e.status === 'pending');
    
    return {
      total: expenses.length,
      thisMonth: thisMonthExpenses.length,
      thisMonthAmount: thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0),
      pending: pendingExpenses.length,
      pendingAmount: pendingExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [expenses]);

  const handleAddExpense = () => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour ajouter des dépenses');
      return;
    }
    
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleEditExpense = (expense: any) => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour modifier des dépenses');
      return;
    }
    
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour supprimer des dépenses');
      return;
    }
    
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
      await loadExpenses();
      toast.success('Dépense supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleViewExpense = (expense: any) => {
    setSelectedExpense(expense);
    setShowDetails(true);
  };

  const handleFormSubmit = async (expenseData: any) => {
    if (!user?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }

    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour cette action');
      return;
    }

    setIsLoading(true);
    
    try {
      // Récupérer le nom de la catégorie
      const categoryDoc = await getDocs(query(
        collection(db, 'expense_categories'),
        where('__name__', '==', expenseData.categoryId)
      ));
      
      let categoryName = 'Catégorie inconnue';
      if (!categoryDoc.empty) {
        categoryName = categoryDoc.docs[0].data().name;
      }

      if (editingExpense) {
        // Modifier une dépense existante
        await updateDoc(doc(db, 'expenses', editingExpense.id), {
          ...expenseData,
          categoryName,
          establishmentId: user.establishmentId,
          userId: user.id,
          userName: user.name,
          updatedAt: Timestamp.now()
        });
        toast.success('Dépense modifiée avec succès');
      } else {
        // Ajouter une nouvelle dépense
        const expenseId = `expense_${Date.now()}`;
        await setDoc(doc(db, 'expenses', expenseId), {
          ...expenseData,
          categoryName,
          establishmentId: user.establishmentId,
          userId: user.id,
          userName: user.name,
          paidAt: expenseData.paidAt ? Timestamp.fromDate(expenseData.paidAt) : null,
          nextDueDate: expenseData.nextDueDate ? Timestamp.fromDate(expenseData.nextDueDate) : null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('Dépense ajoutée avec succès');
      }
      
      await loadExpenses();
      setShowForm(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Titre', 'Catégorie', 'Montant', 'Fournisseur', 'Date', 'Statut', 'Méthode de paiement'],
      ...filteredExpenses.map(e => [
        e.title,
        e.categoryName,
        e.amount,
        e.supplier || '',
        (e.paidAt || e.createdAt).toLocaleDateString('fr-FR'),
        e.status,
        e.paymentMethod
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export réalisé avec succès');
  };

  // Composant pour afficher les détails d'une dépense
  const ExpenseDetails = ({ expense, onClose }: { expense: Expense, onClose: () => void }) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('mg-MG', {
        style: 'currency',
        currency: 'MGA',
        minimumFractionDigits: 0
      }).format(amount).replace('MGA', 'Ar');
    };

    const formatDate = (date: Date | undefined) => {
      if (!date) return 'Non défini';
      return date.toLocaleDateString('fr-FR');
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'paid': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getPaymentMethodLabel = (method: string) => {
      const labels: Record<string, string> = {
        cash: 'Espèces',
        card: 'Carte bancaire',
        bank_transfer: 'Virement bancaire',
        check: 'Chèque'
      };
      return labels[method] || method;
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" padding="none">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DollarSign className="w-6 h-6 mr-2 text-red-600" />
              Détails de la dépense
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Informations principales */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{expense.title}</h3>
              {expense.description && (
                <p className="text-gray-700 mb-3">{expense.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {expense.categoryName}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(expense.status)}`}>
                  {expense.status === 'paid' ? 'Payée' : 
                   expense.status === 'pending' ? 'En attente' : 'Annulée'}
                </span>
              </div>
            </div>

            {/* Montant et paiement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-1">Montant</h4>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(expense.amount)}</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-1">Méthode de paiement</h4>
                <p className="text-lg font-semibold text-blue-700">{getPaymentMethodLabel(expense.paymentMethod)}</p>
              </div>
            </div>

            {/* Informations détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {expense.supplier && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Fournisseur</h4>
                    <p className="text-gray-900">{expense.supplier}</p>
                  </div>
                )}
                
                {expense.invoiceNumber && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">N° de facture</h4>
                    <p className="text-gray-900 font-mono">{expense.invoiceNumber}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Créée par</h4>
                  <p className="text-gray-900">{expense.userName}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {expense.paidAt && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Date de paiement</h4>
                    <p className="text-gray-900">{formatDate(expense.paidAt)}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Date de création</h4>
                  <p className="text-gray-900">{formatDate(expense.createdAt)}</p>
                </div>
                
                {expense.isRecurring && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Récurrence</h4>
                    <div className="flex items-center">
                      <Repeat className="w-4 h-4 mr-1 text-blue-600" />
                      <p className="text-gray-900">
                        {expense.recurringFrequency === 'daily' ? 'Quotidienne' :
                         expense.recurringFrequency === 'weekly' ? 'Hebdomadaire' :
                         expense.recurringFrequency === 'monthly' ? 'Mensuelle' : 'Annuelle'}
                      </p>
                    </div>
                    {expense.nextDueDate && (
                      <p className="text-sm text-blue-600 mt-1">
                        Prochaine échéance: {formatDate(expense.nextDueDate)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            {!isReadOnly && (
              <Button onClick={() => {
                onClose();
                handleEditExpense(expense);
              }}>
                Modifier
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  };

  if (loadingData) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement des dépenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrendingDown className="w-8 h-8 mr-3 text-red-600" />
            Gestion des Dépenses
          </h1>
          <p className="text-gray-600 mt-1">
            Suivez et contrôlez toutes vos dépenses d'entreprise
          </p>
        </div>
        <div className="flex gap-3">
          {!isReadOnly && (
            <>
              <Button variant="ghost" onClick={() => setShowCategoryManager(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Catégories
              </Button>
              <Button onClick={handleAddExpense}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle dépense
              </Button>
            </>
          )}
        </div>
      </div>

      {isReadOnly && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Mode lecture seule</h4>
              <p className="text-sm text-yellow-700 mt-1">
                En tant que Lecteur, vous pouvez uniquement consulter les dépenses mais pas les modifier.
                Contactez un administrateur si vous avez besoin de ces permissions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Aperçu financier rapide */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {new Intl.NumberFormat('mg-MG', {
                style: 'currency',
                currency: 'MGA',
                minimumFractionDigits: 0
              }).format(stats.thisMonthAmount).replace('MGA', 'Ar')}
            </div>
            <p className="text-gray-600">Dépenses ce mois</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {new Intl.NumberFormat('mg-MG', {
                style: 'currency',
                currency: 'MGA',
                minimumFractionDigits: 0
              }).format(stats.pendingAmount).replace('MGA', 'Ar')}
            </div>
            <p className="text-gray-600">En attente de paiement</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-gray-600">Total des dépenses</p>
          </div>
        </div>
      </Card>

      <ExpenseFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={setSelectedPaymentMethod}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={handleExport}
        stats={stats}
      />

      <ExpenseTable
        expenses={filteredExpenses}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
        onView={handleViewExpense}
        isLoading={false}
        userRole={user?.role || ''}
      />

      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
          isLoading={isLoading}
        />
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Gestion des catégories</h2>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ExpenseCategoryManager readOnly={isReadOnly} />
          </Card>
        </div>
      )}

      {showDetails && selectedExpense && (
        <ExpenseDetails 
          expense={selectedExpense} 
          onClose={() => {
            setShowDetails(false);
            setSelectedExpense(null);
          }} 
        />
      )}
    </div>
  );
};