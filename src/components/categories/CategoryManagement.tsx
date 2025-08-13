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
  Palette,
  Package,
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

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  establishmentId: string;
  createdAt: Date;
  productCount?: number;
}

const colorOptions = [
  { id: 'blue', name: 'Bleu', class: 'bg-blue-500' },
  { id: 'green', name: 'Vert', class: 'bg-green-500' },
  { id: 'purple', name: 'Violet', class: 'bg-purple-500' },
  { id: 'orange', name: 'Orange', class: 'bg-orange-500' },
  { id: 'red', name: 'Rouge', class: 'bg-red-500' },
  { id: 'yellow', name: 'Jaune', class: 'bg-yellow-500' },
  { id: 'pink', name: 'Rose', class: 'bg-pink-500' },
  { id: 'indigo', name: 'Indigo', class: 'bg-indigo-500' },
  { id: 'teal', name: 'Sarcelle', class: 'bg-teal-500' },
  { id: 'gray', name: 'Gris', class: 'bg-gray-500' }
];

interface CategoryManagementProps {
  readOnly?: boolean;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ readOnly = false }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'blue'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useAuthStore();

  // Charger les catégories
  const loadCategories = async () => {
    if (!user?.establishmentId) return;

    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'categories'),
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
          establishmentId: data.establishmentId,
          createdAt: data.createdAt?.toDate() || new Date(),
          productCount: 0 // TODO: Calculer le nombre de produits
        } as Category;
      });

      setCategories(categoriesData);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      toast.error('Erreur lors du chargement des catégories');
    } finally {
      setIsLoading(false);
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
    setFormData({ name: '', description: '', color: 'blue' });
    setErrors({});
    setShowForm(true);
  };

  const handleEditCategory = (category: Category) => {
    if (readOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour modifier des catégories');
      return;
    }
    
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color
    });
    setErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la catégorie est requis';
    }

    // Vérifier si le nom existe déjà (sauf pour la catégorie en cours d'édition)
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
    
    if (!validateForm() || !user?.establishmentId) return;

    try {
      if (editingCategory) {
        // Modifier une catégorie existante
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          updatedAt: Timestamp.now()
        });
        toast.success('Catégorie modifiée avec succès');
      } else {
        // Créer une nouvelle catégorie
        const categoryId = `${user.establishmentId}_${Date.now()}`;
        await setDoc(doc(db, 'categories', categoryId), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          establishmentId: user.establishmentId,
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

    // TODO: Vérifier s'il y a des produits dans cette catégorie
    if (category.productCount && category.productCount > 0) {
      toast.error(`Impossible de supprimer: ${category.productCount} produit(s) utilisent cette catégorie`);
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'categories', categoryId));
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
          <h2 className="text-xl font-bold text-gray-900">Gestion des Catégories</h2>
          <p className="text-gray-600 mt-1">
            Organisez vos produits avec des catégories personnalisées
          </p>
        </div>
        {!readOnly && (
          <Button onClick={handleAddCategory}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle catégorie
          </Button>
        )}
      </div>

      {/* Suggestions de catégories pour différents secteurs */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Suggestions de catégories</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">🖥️ Matériel Informatique</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Ordinateurs portables</li>
              <li>• Ordinateurs de bureau</li>
              <li>• Composants PC</li>
              <li>• Périphériques</li>
              <li>• Accessoires</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">🏪 Commerce Général</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Alimentation</li>
              <li>• Boissons</li>
              <li>• Produits ménagers</li>
              <li>• Hygiène & Beauté</li>
              <li>• Papeterie</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">👕 Mode & Textile</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Vêtements Homme</li>
              <li>• Vêtements Femme</li>
              <li>• Vêtements Enfant</li>
              <li>• Chaussures</li>
              <li>• Accessoires</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Liste des catégories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} padding="md">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${getColorClass(category.color)}`}></div>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {category.productCount || 0} produit(s)
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie</h3>
            <p className="text-gray-500 mb-6">Créez votre première catégorie pour organiser vos produits</p>
            {!readOnly && (
              <Button onClick={handleAddCategory}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une catégorie
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
                placeholder="Ex: Matériel Informatique"
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
                  <Palette className="w-4 h-4 inline mr-1" />
                  Couleur de la catégorie
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.id })}
                      className={`w-10 h-10 rounded-lg ${color.class} border-2 transition-all ${
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