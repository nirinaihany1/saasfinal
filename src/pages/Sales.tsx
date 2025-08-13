import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { SalesFilters } from '../components/sales/SalesFilters';
import { SalesTable } from '../components/sales/SalesTable';
import { SaleDetails } from '../components/sales/SaleDetails';
import { Download, FileText } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  updateDoc,
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface Sale {
  id: string;
  receiptNumber: string;
  date: string;
  cashierName: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  paymentAmount: number;
  changeAmount: number;
  status: string;
}

export const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuthStore();

  // Charger les ventes depuis Firebase
  const loadSales = async () => {
    if (!user?.establishmentId) return;

    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'sales'),
        where('establishmentId', '==', user.establishmentId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const salesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          receiptNumber: data.receiptNumber,
          date: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          cashierName: data.cashierName,
          customerName: data.customerName || 'Client anonyme',
          items: data.items.map((item: any) => ({
            name: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          })),
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          total: data.total,
          paymentMethod: data.paymentMethod,
          paymentAmount: data.paymentAmount,
          changeAmount: data.changeAmount,
          status: data.status
        } as Sale;
      });

      setSales(salesData);
    } catch (error) {
      console.error('Erreur lors du chargement des ventes:', error);
      toast.error('Erreur lors du chargement des ventes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [user?.establishmentId]);

  // Filter sales based on search and filters
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = 
        sale.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.cashierName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'all' || sale.status === selectedStatus;
      const matchesPayment = selectedPaymentMethod === 'all' || sale.paymentMethod === selectedPaymentMethod;

      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        const saleDate = new Date(sale.date).toISOString().split('T')[0];
        matchesDate = saleDate >= dateRange.start && saleDate <= dateRange.end;
      }

      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    });
  }, [sales, searchTerm, selectedStatus, selectedPaymentMethod, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.date.startsWith(today) && s.status === 'completed');
    
    return {
      total: sales.length,
      today: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
      completed: sales.filter(s => s.status === 'completed').length,
      refunded: sales.filter(s => s.status === 'refunded').length,
    };
  }, [sales]);

  const handleViewSale = (sale: any) => {
    setSelectedSale(sale);
    setShowDetails(true);
  };

  const handlePrintReceipt = (sale: any) => {
    // In a real app, this would generate and print a receipt
    toast.success(`Impression du reçu ${sale.receiptNumber}`);
  };

  const handleRefundSale = async (saleId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir rembourser cette vente ?')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'sales', saleId), {
        status: 'refunded',
        updatedAt: Timestamp.now()
      });

      await loadSales();
      toast.success('Vente remboursée avec succès');
    } catch (error) {
      console.error('Erreur lors du remboursement:', error);
      toast.error('Erreur lors du remboursement');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['N° Reçu', 'Date', 'Client', 'Caissier', 'Total', 'Paiement', 'Statut'],
      ...filteredSales.map(s => [
        s.receiptNumber,
        new Date(s.date).toLocaleDateString('fr-FR'),
        s.customerName,
        s.cashierName,
        s.total,
        s.paymentMethod,
        s.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export réalisé avec succès');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement des ventes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des Ventes</h1>
          <p className="text-gray-600 mt-1">
            Consultez et gérez toutes vos transactions
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            Rapport détaillé
          </Button>
        </div>
      </div>

      <SalesFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={setSelectedPaymentMethod}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        stats={stats}
      />

      <SalesTable
        sales={filteredSales}
        onView={handleViewSale}
        onPrint={handlePrintReceipt}
        onRefund={handleRefundSale}
        isLoading={false}
      />

      {showDetails && selectedSale && (
        <SaleDetails
          sale={selectedSale}
          onClose={() => {
            setShowDetails(false);
            setSelectedSale(null);
          }}
          onPrint={() => handlePrintReceipt(selectedSale)}
          onRefund={() => {
            handleRefundSale(selectedSale.id);
            setShowDetails(false);
            setSelectedSale(null);
          }}
        />
      )}
    </div>
  );
};