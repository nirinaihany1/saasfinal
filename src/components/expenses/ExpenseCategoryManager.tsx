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
  Tag,
  Home,
  Car,
  Zap,
  Users,
  Briefcase,
  ShoppingCart,
  Wrench,
  Wifi,
  Coffee,
  AlertTriangle
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

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isDefault: boolean;
  establishmentId: string;
  createdAt: Date;
  expenseCount?: number;
}

const colorOptions = [
  { id: 'red', name: 'Rouge', class: 'bg-red-500' },
  { id: 'orange', name: 'Orange', class: 'bg-orange-500' },
  { id: 'yellow', name: 'Jaune', class: 'bg-yellow-500' },
  { id: 'green', name: 'Vert', class: 'bg-green-500' },
  { id: 'blue', name: 'Bleu', class: 'bg-blue-500' },
  { id: 'purple', name: 'Violet', class: 'bg-purple-500' },
  { id: 'pink', name: 'Rose', class: 'bg-pink-500' },
  { id: 'gray', name: 'Gris', class: 'bg-gray-500' }
];

const iconOptions = [
  { id: '🏠', name: 'Maison', component: Home },
  { id: '🚗', name: 'Transport', component: Car },
  { id: '⚡', name: 'Électricité', component: Zap },
  { id: '👥', name: 'Personnel', component: Users },
  { id: '💼', name: 'Bureau', component: Briefcase },
  { id: '🛒', name: 'Achats', component: ShoppingCart },
  { id: '🔧', name: 'Maintenance', component: Wrench },
  { id: '📶', name: 'Internet', component: Wifi },
  { id: '☕', name: 'Restauration', component: Coffee }
];

interface ExpenseCategoryManagerProps {
  readOnly?: boolean;
}

export const ExpenseCategoryManager: React.FC<ExpenseCategoryManagerProps> = ({ readOnly = false }) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'red',
    icon: '🏠'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useAuthStore();

  // Charger les catégories de dépenses
  const loadCategories = async () => {
    if (!user?.establishmentId) return;

    try {
      setIsLoading(true);
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
          description: data.description || '',
          color: data.color,
          icon: data.icon,
          isDefault: data.isDefault || false,
          establishmentId: data.establishmentId,
          createdAt: data.createdAt?.toDate() || new Date(),
          expenseCount: 0 // TODO: Calculer le nombre de dépenses
        } as ExpenseCategory;
      });

      setCategories(categoriesData);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      toast.error('Erreur lors du chargement des catégories');
    } finally {
      setIsLoading(false);
    }
  };

  // Créer les catégories par défaut
  const createDefaultCategories = async () => {
    if (!user?.establishmentId || readOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour cette action');
      return;
    }

    const defaultCategories = [
      { name: 'Loyer', description: 'Loyer du local commercial', color: 'red', icon: '🏠' },
      { name: 'Électricité', description: 'Factures d\'électricité', color: 'yellow', icon: '⚡' },
      { name: 'Carburant', description: 'Essence et transport', color: 'blue', icon: '🚗' },
      { name: 'Salaires', description: 'Rémunération du personnel', color: 'green', icon: '👥' },
      { name: 'Fournitures', description: 'Matériel et fournitures', color: 'purple', icon: '🛒' },
      { name: 'Maintenance', description: 'Réparations et entretien', color: 'orange', icon: '🔧' },
      { name: 'Internet & Téléphone', description: 'Frais de communication', color: 'blue', icon: '📶' },
      { name: 'Restauration', description: 'Repas et collations', color: 'pink', icon: '☕' }
    ];

    try {
      for (const category of defaultCategories) {
        const categoryId = `${user.establishmentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, 'expense_categories', categoryId), {
          ...category,
          establishmentId: user.establishmentId,
          isDefault: true,
          createdAt: Timestamp.now()
        });
      }
      
      await loadCategories();
      toast.success('Catégories par défaut créées');
    } catch (error) {
      console.error('Erreur lors de la création des catégories par défaut:', error);
      toast.error('Erreur lors de la création des catégories par défaut');
    }
  };

  useEffect(() => {
    loadCategories();
  }, [user?.establishmentId]);

  const handleAddCategory = () => {
    if (readOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour ajouter des catégories');
      return;
    }
    
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: 'red', icon: '🏠' });
    setErrors({});
    setShowForm(true);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    if (readOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour modifier des catégories');
      return;
    }
    
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon
    });
    setErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la catégorie est requis';
    }

    // Vérifier si le nom existe déjà
    const existingCategory = categories.find(cat => 
      cat.name.toLowerCase() === formData.name.toLowerCase() && 
      cat.id !== editingCategory?.id
    );
    
    if (existingCategory) {
      newErrors.name = 'Une catégorie avec ce nom existe déjà';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.establishmentId || readOnly) return;

    try {
      if (editingCategory) {
        // Modifier une catégorie existante
        await updateDoc(doc(db, 'expense_categories', editingCategory.id), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          icon: formData.icon,
          updatedAt: Timestamp.now()
        });
        toast.success('Catégorie modifiée avec succès');
      } else {
        // Créer une nouvelle catégorie
        const categoryId = `${user.establishmentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, 'expense_categories', categoryId), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          icon: formData.icon,
          establishmentId: user.establishmentId,
          isDefault: false,
          createdAt: Timestamp.now()
        });
        toast.success('Catégorie créée avec succès');
      }

      await loadCategories();
      setShowForm(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (readOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour supprimer des catégories');
      return;
    }
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    if (category.isDefault) {
      toast.error('Impossible de supprimer une catégorie par défaut');
      return;
    }

    // TODO: Vérifier s'il y a des dépenses dans cette catégorie
    if (category.expenseCount && category.expenseCount > 0) {
      toast.error(`Impossible de supprimer: ${category.expenseCount} dépense(s) utilisent cette catégorie`);
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'expense_categories', categoryId));
      await loadCategories();
      toast.success('Catégorie supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getColorClass = (color: string) => {
    const colorOption = colorOptions.find(c => c.id === color);
    return colorOption ? colorOption.class : 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement des catégories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Catégories de dépenses</h3>
          <p className="text-gray-600 mt-1">
            Organisez vos dépenses par catégories
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            {categories.length === 0 && (
              <Button variant="ghost" onClick={createDefaultCategories}>
                Créer catégories par défaut
              </Button>
            )}
            <Button onClick={handleAddCategory}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle catégorie
            </Button>
          </div>
        )}
      </div>

      {readOnly && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Mode lecture seule</h4>
              <p className="text-sm text-yellow-700 mt-1">
                En tant que Lecteur, vous pouvez uniquement consulter les catégories mais pas les modifier.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Liste des catégories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} padding="md">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg ${getColorClass(category.color)} flex items-center justify-center text-white text-lg`}>
                  {category.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    {category.name}
                    {category.isDefault && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Défaut
                      </span>
                    )}
                  </h4>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {category.expenseCount || 0} dépense(s)
                  </p>
                </div>
              </div>
              {!readOnly && (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCategory(category)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {!category.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie de dépense</h3>
            <p className="text-gray-500 mb-6">Créez des catégories pour organiser vos dépenses</p>
            {!readOnly && (
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={createDefaultCategories}>
                  Catégories par défaut
                </Button>
                <Button onClick={handleAddCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une catégorie
                </Button>
              </div>
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
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
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
                label="Nom de la catégorie *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                placeholder="Ex: Loyer"
                leftIcon={<Tag className="w-4 h-4" />}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnel)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Description de la catégorie..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Icône
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: icon.id })}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                        formData.icon === icon.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      title={icon.name}
                    >
                      <span className="text-2xl">{icon.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Couleur
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.id })}
                      className={`w-12 h-12 rounded-lg ${color.class} border-2 transition-all ${
                        formData.color === color.id 
                          ? 'border-gray-800 scale-110' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {editingCategory ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};