import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { CustomerForm } from '../components/customers/CustomerForm';
import { CustomerTable } from '../components/customers/CustomerTable';
import { CustomerFilters } from '../components/customers/CustomerFilters';
import { Plus, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
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
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  loyaltyPoints: number;
  totalSpent: number;
  lastPurchase: string | null;
  createdAt: string;
  isActive: boolean;
  establishmentId: string;
}

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'reader';

  // Charger les clients depuis Firestore
  const loadCustomers = async () => {
    if (!user?.establishmentId) return;

    try {
      setLoadingData(true);
      const q = query(
        collection(db, 'customers'),
        where('establishmentId', '==', user.establishmentId)
      );
      
      const snapshot = await getDocs(q);
      const customersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          loyaltyPoints: data.loyaltyPoints || 0,
          totalSpent: data.totalSpent || 0,
          lastPurchase: data.lastPurchase ? data.lastPurchase.toDate().toISOString() : null,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          isActive: data.isActive !== false,
          establishmentId: data.establishmentId
        } as Customer;
      });

      setCustomers(customersData);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [user?.establishmentId]);

  // Filter customers based on search and filters
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm);

      let matchesStatus = true;
      switch (selectedStatus) {
        case 'active':
          matchesStatus = customer.isActive;
          break;
        case 'inactive':
          matchesStatus = !customer.isActive;
          break;
        case 'vip':
          matchesStatus = customer.loyaltyPoints >= 200;
          break;
        default:
          matchesStatus = true;
      }

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: customers.length,
      active: customers.filter(c => c.isActive).length,
      vip: customers.filter(c => c.loyaltyPoints >= 200).length,
      totalSpent: customers.reduce((sum, c) => sum + c.totalSpent, 0),
    };
  }, [customers]);

  const handleAddCustomer = () => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour ajouter des clients');
      return;
    }
    
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEditCustomer = (customer: any) => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour modifier des clients');
      return;
    }
    
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour supprimer des clients');
      return;
    }
    
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      return;
    }

    try {
      // Supprimer le client de Firestore
      await deleteDoc(doc(db, 'customers', customerId));
      
      // Mettre à jour l'état local
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      
      toast.success('Client supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
      toast.error('Erreur lors de la suppression du client');
    }
  };

  const handleViewCustomer = (customer: any) => {
    toast.success(`Affichage des détails de ${customer.name}`);
  };

  const handleFormSubmit = async (customerData: any) => {
    if (isReadOnly) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour cette action');
      return;
    }
    
    if (!user?.establishmentId) {
      toast.error('Établissement non trouvé');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (editingCustomer) {
        // Modifier un client existant
        await updateDoc(doc(db, 'customers', editingCustomer.id), {
          ...customerData,
          updatedAt: Timestamp.now()
        });
        
        // Mettre à jour l'état local
        setCustomers(prev => prev.map(c => 
          c.id === editingCustomer.id 
            ? { 
                ...c, 
                ...customerData, 
                updatedAt: new Date().toISOString() 
              }
            : c
        ));
        
        toast.success('Client modifié avec succès');
      } else {
        // Ajouter un nouveau client
        const customerId = `customer_${Date.now()}`;
        const newCustomer = {
          ...customerData,
          id: customerId,
          loyaltyPoints: 0,
          totalSpent: 0,
          lastPurchase: null,
          establishmentId: user.establishmentId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        await setDoc(doc(db, 'customers', customerId), newCustomer);
        
        // Mettre à jour l'état local
        setCustomers(prev => [...prev, {
          ...newCustomer,
          id: customerId,
          lastPurchase: null,
          createdAt: new Date().toISOString(),
          isActive: customerData.isActive
        }]);
        
        toast.success('Client ajouté avec succès');
      }
      
      setShowForm(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du client:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Nom', 'Email', 'Téléphone', 'Adresse', 'Points fidélité', 'Total dépensé', 'Statut'],
      ...filteredCustomers.map(c => [
        c.name,
        c.email,
        c.phone,
        c.address,
        c.loyaltyPoints,
        c.totalSpent,
        c.isActive ? 'Actif' : 'Inactif'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export réalisé avec succès');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Clients</h1>
          <p className="text-gray-600 mt-1">
            Gérez votre base clients et programme de fidélité
          </p>
        </div>
        {!isReadOnly && (
          <Button onClick={handleAddCustomer}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un client
          </Button>
        )}
      </div>

      {isReadOnly && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Mode lecture seule</h4>
              <p className="text-sm text-yellow-700 mt-1">
                En tant que Lecteur, vous pouvez uniquement consulter les clients mais pas les modifier.
                Contactez un administrateur si vous avez besoin de ces permissions.
              </p>
            </div>
          </div>
        </Card>
      )}

      <CustomerFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onExport={handleExport}
        stats={stats}
      />

      {loadingData ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement des clients...</p>
        </div>
      ) : (
        <CustomerTable
          customers={filteredCustomers}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
          onView={handleViewCustomer}
          isLoading={false}
          userRole={user?.role || ''}
        />
      )}

      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};