import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  X, 
  DollarSign, 
  FileText, 
  User, 
  Calendar,
  Repeat,
  Upload,
  Tag
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ExpenseFormProps {
  expense?: any;
  onSubmit: (expenseData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const paymentMethods = [
  { id: 'cash', name: 'Espèces' },
  { id: 'card', name: 'Carte bancaire' },
  { id: 'bank_transfer', name: 'Virement bancaire' },
  { id: 'check', name: 'Chèque' }
];

const recurringFrequencies = [
  { id: 'daily', name: 'Quotidien' },
  { id: 'weekly', name: 'Hebdomadaire' },
  { id: 'monthly', name: 'Mensuel' },
  { id: 'yearly', name: 'Annuel' }
];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  expense,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    title: expense?.title || '',
    description: expense?.description || '',
    amount: expense?.amount || '',
    categoryId: expense?.categoryId || '',
    paymentMethod: expense?.paymentMethod || 'cash',
    supplier: expense?.supplier || '',
    invoiceNumber: expense?.invoiceNumber || '',
    isRecurring: expense?.isRecurring || false,
    recurringFrequency: expense?.recurringFrequency || 'monthly',
    nextDueDate: expense?.nextDueDate ? expense.nextDueDate.toISOString().split('T')[0] : '',
    status: expense?.status || 'paid',
    paidAt: expense?.paidAt ? expense.paidAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les catégories de dépenses
  useEffect(() => {
    const loadCategories = async () => {
      if (!user?.establishmentId) return;

      try {
        setLoadingCategories(true);
        const q = query(
          collection(db, 'expense_categories'),
          where('establishmentId', '==', user.establishmentId)
        );
        
        const snapshot = await getDocs(q);
        const categoriesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            icon: data.icon,
            color: data.color
          } as ExpenseCategory;
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

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Le titre est requis';
    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = 'Le montant doit être supérieur à 0';
    }
    if (!formData.categoryId) newErrors.categoryId = 'La catégorie est requise';
    if (!formData.paidAt) newErrors.paidAt = 'La date est requise';

    if (formData.isRecurring && !formData.nextDueDate) {
      newErrors.nextDueDate = 'La prochaine échéance est requise pour les dépenses récurrentes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const expenseData = {
        ...formData,
        amount: Number(formData.amount),
        paidAt: formData.status === 'paid' ? new Date(formData.paidAt) : null,
        nextDueDate: formData.isRecurring && formData.nextDueDate ? new Date(formData.nextDueDate) : null
      };
      onSubmit(expenseData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" padding="none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Informations générales */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Titre de la dépense *"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    error={errors.title}
                    leftIcon={<FileText className="w-4 h-4" />}
                    placeholder="Ex: Loyer du magasin"
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
                    placeholder="Description détaillée de la dépense..."
                  />
                </div>

                <Input
                  label="Montant (Ar) *"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  error={errors.amount}
                  leftIcon={<DollarSign className="w-4 h-4" />}
                  placeholder="50000"
                />

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
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>}
                </div>
              </div>
            </div>

            {/* Détails du paiement */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Détails du paiement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Méthode de paiement
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => handleChange('paymentMethod', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="paid">Payée</option>
                    <option value="pending">En attente</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>

                <Input
                  label="Fournisseur"
                  value={formData.supplier}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  placeholder="Nom du fournisseur"
                />

                <Input
                  label="N° de facture"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  leftIcon={<FileText className="w-4 h-4" />}
                  placeholder="FAC-2024-001"
                />

                {formData.status === 'paid' && (
                  <Input
                    label="Date de paiement *"
                    type="date"
                    value={formData.paidAt}
                    onChange={(e) => handleChange('paidAt', e.target.value)}
                    error={errors.paidAt}
                    leftIcon={<Calendar className="w-4 h-4" />}
                  />
                )}
              </div>
            </div>

            {/* Récurrence */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Récurrence</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => handleChange('isRecurring', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isRecurring" className="ml-2 text-sm text-gray-700">
                    <Repeat className="w-4 h-4 inline mr-1" />
                    Dépense récurrente
                  </label>
                </div>

                {formData.isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fréquence
                      </label>
                      <select
                        value={formData.recurringFrequency}
                        onChange={(e) => handleChange('recurringFrequency', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {recurringFrequencies.map(freq => (
                          <option key={freq.id} value={freq.id}>
                            {freq.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Prochaine échéance *"
                      type="date"
                      value={formData.nextDueDate}
                      onChange={(e) => handleChange('nextDueDate', e.target.value)}
                      error={errors.nextDueDate}
                      leftIcon={<Calendar className="w-4 h-4" />}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Justificatif */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Justificatif</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Téléchargez une photo de la facture ou du reçu
                </p>
                <Button variant="ghost" size="sm">
                  Choisir un fichier
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Formats acceptés: JPG, PNG, PDF (max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || categories.length === 0}>
              {isLoading ? 'Enregistrement...' : expense ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};