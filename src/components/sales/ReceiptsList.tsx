import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { 
  Receipt, 
  Eye, 
  Printer, 
  Download,
  Search,
  Calendar,
  User,
  DollarSign,
  Filter,
  RefreshCw,
  FileText,
  CreditCard,
  Banknote,
  Smartphone
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
import toast from 'react-hot-toast';
import { ReceiptGenerator } from '../pos/ReceiptGenerator';
import { doc, getDoc } from 'firebase/firestore';
import { formatAmountInWords } from '../../utils/numberToWords';
import { getAmountInWords } from '../../utils/numberToWords';
import { sendReceiptByEmail } from '../../services/emailService';

interface ReceiptData {
  id: string;
  receiptNumber: string;
  date: Date;
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
  storeId?: string;
  storeName?: string;
}

export const ReceiptsList: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [establishmentInfo, setEstablishmentInfo] = useState<any>(null);

  const { user } = useAuthStore();

  // Charger les informations de l'établissement
  const loadEstablishmentInfo = async () => {
    if (!user?.establishmentId) return;

    try {
      const estDoc = await getDoc(doc(db, 'establishments', user.establishmentId));
      if (estDoc.exists()) {
        const data = estDoc.data();
        setEstablishmentInfo({
          name: data.name || 'Nirina Nirina Pos Madagascar',
          address: data.address || 'Antananarivo, Madagascar',
          phone: data.phone || '+261 34 12 345 67',
          email: data.email || 'contact@saaspos.mg',
          nif: data.nif || '',
          stat: data.stat || ''
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des informations établissement:', error);
    }
  };

  // Charger tous les reçus
  const loadReceipts = async () => {
    if (!user?.establishmentId) return;

    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'sales'),
        where('establishmentId', '==', user.establishmentId),
        where('status', '==', 'completed'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      // Charger les informations des magasins pour afficher les noms
      const storesQuery = query(
        collection(db, 'stores'),
        where('establishmentId', '==', user.establishmentId)
      );
      const storesSnapshot = await getDocs(storesQuery);
      const storesMap = new Map();
      storesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        storesMap.set(doc.id, data.name);
      });

      const receiptsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          receiptNumber: data.receiptNumber,
          date: data.createdAt?.toDate() || new Date(),
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
          status: data.status,
          storeId: data.storeId,
          storeName: data.storeId ? storesMap.get(data.storeId) || 'Magasin inconnu' : 'Non spécifié'
        } as ReceiptData;
      });

      setReceipts(receiptsData);
    } catch (error) {
      console.error('Erreur lors du chargement des reçus:', error);
      toast.error('Erreur lors du chargement des reçus');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEstablishmentInfo();
    loadReceipts();
  }, [user?.establishmentId]);

  // Filtrer les reçus
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = 
      receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.cashierName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPayment = selectedPaymentMethod === 'all' || receipt.paymentMethod === selectedPaymentMethod;

    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const receiptDate = receipt.date.toISOString().split('T')[0];
      matchesDate = receiptDate >= dateRange.start && receiptDate <= dateRange.end;
    }

    return matchesSearch && matchesPayment && matchesDate;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return Banknote;
      case 'card': return CreditCard;
      case 'mvola':
      case 'orange_money':
      case 'airtel_money': return Smartphone;
      default: return CreditCard;
    }
  };

  const getPaymentLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Espèces',
      card: 'Carte',
      mvola: 'Mvola',
      orange_money: 'Orange Money',
      airtel_money: 'Airtel Money'
    };
    return labels[method] || method;
  };

  const handleViewReceipt = (receipt: ReceiptData) => {
    // Convertir les données du reçu au format attendu par ReceiptGenerator
    const receiptData = {
      receiptNumber: receipt.receiptNumber,
      date: receipt.date,
      cashierName: receipt.cashierName,
      customerName: receipt.customerName,
      items: receipt.items,
      subtotal: receipt.subtotal,
      taxAmount: receipt.taxAmount,
      total: receipt.total,
      paymentMethod: receipt.paymentMethod,
      paymentAmount: receipt.paymentAmount,
      changeAmount: receipt.changeAmount,
      amountInWords: getAmountInWords(receipt.total),
      establishmentInfo: establishmentInfo || {
        name: 'Nirina Nirina Pos Madagascar',
        address: 'Antananarivo, Madagascar',
        phone: '+261 34 12 345 67',
        email: 'contact@saaspos.mg',
        nif: '',
        stat: ''
      }
    };

    setSelectedReceipt(receiptData);
    setShowReceiptDetails(true);
  };

  const handlePrintReceipt = (receipt: ReceiptData) => {
    // Créer une fenêtre d'impression avec le contenu du reçu
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reçu ${receipt.receiptNumber}</title>
          <style>
            body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0; padding: 10px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .company-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            .company-info { font-size: 10px; line-height: 1.4; }
            .receipt-info { margin: 10px 0; font-size: 10px; }
            .items { margin: 10px 0; }
            .item { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; }
            .totals { border-top: 2px solid #000; padding-top: 10px; margin-top: 15px; font-size: 10px; }
            .total-line { display: flex; justify-content: space-between; margin: 2px 0; }
            .grand-total { font-weight: bold; font-size: 12px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 15px; border-top: 2px solid #000; padding-top: 10px; font-size: 10px; }
            @media print { body { margin: 0; padding: 5px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${establishmentInfo?.name || 'Nirina Nirina Pos Madagascar'}</div>
            <div class="company-info">
              ${establishmentInfo?.address || 'Antananarivo, Madagascar'}<br>
              Tél: ${establishmentInfo?.phone || '+261 34 12 345 67'}<br>
              Email: ${establishmentInfo?.email || 'contact@saaspos.mg'}
            </div>
          </div>
          
          <div class="receipt-info">
            <div><strong>Reçu N°:</strong> ${receipt.receiptNumber}</div>
            <div><strong>Date:</strong> ${formatDate(receipt.date)}</div>
            <div><strong>Caissier:</strong> ${receipt.cashierName}</div>
            <div><strong>Client:</strong> ${receipt.customerName}</div>
          </div>
          
          <div class="items">
            ${receipt.items.map(item => `
              <div class="item">
                <span>${item.name} x${item.quantity}</span>
                <span>${formatCurrency(item.total)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="totals">
            <div class="total-line">
              <span>Sous-total:</span>
              <span>${formatCurrency(receipt.subtotal)}</span>
            </div>
            <div class="total-line">
              <span>TVA:</span>
              <span>${formatCurrency(receipt.taxAmount)}</span>
            </div>
            <div class="total-line grand-total">
              <span>TOTAL:</span>
              <span>${formatCurrency(receipt.total)}</span>
            </div>
            <div class="total-line">
              <span>Payé (${getPaymentLabel(receipt.paymentMethod)}):</span>
              <span>${formatCurrency(receipt.paymentAmount)}</span>
            </div>
            ${receipt.changeAmount > 0 ? `
              <div class="total-line">
                <span>Rendu:</span>
                <span>${formatCurrency(receipt.changeAmount)}</span>
              </div>
            ` : ''}
            
            <div class="amount-in-words" style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-style: italic; font-size: 10px;">
              ${formatAmountInWords(receipt.total)}
            </div>
          </div>
          
          <div class="footer">
            Merci de votre visite !
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleEmailReceipt = (email: string) => {
    // Cette fonction est maintenant gérée directement dans ReceiptGenerator
    // avec EmailJS, donc on affiche juste une confirmation
    toast.success(`Reçu envoyé à ${email}`, {
      duration: 4000,
      icon: '📧'
    });
  };

  const exportReceipts = () => {
    const csvContent = [
      ['N° Reçu', 'Date', 'Caissier', 'Client', 'Magasin', 'Total', 'Paiement', 'Statut'],
      ...filteredReceipts.map(r => [
        r.receiptNumber,
        formatDate(r.date),
        r.cashierName,
        r.customerName,
        r.storeName || 'Non spécifié',
        r.total,
        getPaymentLabel(r.paymentMethod),
        r.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reçus_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Liste des reçus exportée avec succès');
  };

  const setTodayRange = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateRange({ start: today, end: today });
  };

  const setWeekRange = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setDateRange({ 
      start: weekAgo.toISOString().split('T')[0], 
      end: today.toISOString().split('T')[0] 
    });
  };

  const setMonthRange = () => {
    const today = new Date();
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setDateRange({ 
      start: monthAgo.toISOString().split('T')[0], 
      end: today.toISOString().split('T')[0] 
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement des reçus...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Receipt className="w-8 h-8 mr-3 text-blue-600" />
            Historique des Reçus
          </h1>
          <p className="text-gray-600 mt-1">
            Consultez et gérez tous les reçus générés
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => loadReceipts()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="ghost" onClick={exportReceipts}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total reçus</p>
              <p className="text-2xl font-bold text-gray-900">{receipts.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">CA total</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(receipts.reduce((sum, r) => sum + r.total, 0))}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">
                {receipts.filter(r => {
                  const today = new Date().toISOString().split('T')[0];
                  return r.date.toISOString().split('T')[0] === today;
                }).length}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <User className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ticket moyen</p>
              <p className="text-xl font-bold text-gray-900">
                {receipts.length > 0 
                  ? formatCurrency(receipts.reduce((sum, r) => sum + r.total, 0) / receipts.length)
                  : formatCurrency(0)
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Input
            placeholder="Rechercher par n° reçu, client ou caissier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-5 h-5 text-gray-400" />}
          />
          
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les paiements</option>
            <option value="cash">Espèces</option>
            <option value="card">Carte</option>
            <option value="mvola">Mvola</option>
            <option value="orange_money">Orange Money</option>
            <option value="airtel_money">Airtel Money</option>
          </select>

          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Date de début"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Date de fin"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={setTodayRange}>
              <Calendar className="w-4 h-4 mr-1" />
              Aujourd'hui
            </Button>
            <Button variant="ghost" size="sm" onClick={setWeekRange}>
              <Calendar className="w-4 h-4 mr-1" />
              7 derniers jours
            </Button>
            <Button variant="ghost" size="sm" onClick={setMonthRange}>
              <Calendar className="w-4 h-4 mr-1" />
              30 derniers jours
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            {filteredReceipts.length} reçu(s) trouvé(s)
          </div>
        </div>
      </Card>

      {/* Liste des reçus */}
      {filteredReceipts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun reçu trouvé</h3>
            <p className="text-gray-500">
              {searchTerm || dateRange.start || selectedPaymentMethod !== 'all'
                ? 'Aucun reçu ne correspond à vos critères de recherche'
                : 'Aucun reçu n\'a encore été généré'
              }
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reçu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client & Caissier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Magasin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Articles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paiement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.map((receipt) => {
                  const PaymentIcon = getPaymentIcon(receipt.paymentMethod);

                  return (
                    <tr key={receipt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <Receipt className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{receipt.receiptNumber}</div>
                            <div className="text-sm text-gray-500">{formatDate(receipt.date)}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{receipt.customerName}</div>
                          <div className="text-gray-500">par {receipt.cashierName}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{receipt.storeName}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {receipt.items.reduce((sum, item) => sum + item.quantity, 0)} articles
                          </div>
                          <div className="text-gray-500 text-xs">
                            {receipt.items.slice(0, 2).map(item => item.name).join(', ')}
                            {receipt.items.length > 2 && '...'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm">
                          <PaymentIcon className="w-4 h-4 mr-2 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">{getPaymentLabel(receipt.paymentMethod)}</div>
                            {receipt.changeAmount > 0 && (
                              <div className="text-gray-500 text-xs">
                                Rendu: {formatCurrency(receipt.changeAmount)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-bold text-gray-900">{formatCurrency(receipt.total)}</div>
                          <div className="text-gray-500 text-xs">
                            HT: {formatCurrency(receipt.subtotal)}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReceipt(receipt)}
                            title="Voir le reçu"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintReceipt(receipt)}
                            title="Imprimer le reçu"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de détails du reçu */}
      {showReceiptDetails && selectedReceipt && (
        <ReceiptGenerator
          receiptData={selectedReceipt}
          onClose={() => {
            setShowReceiptDetails(false);
            setSelectedReceipt(null);
          }}
          onPrint={() => {
            handlePrintReceipt(selectedReceipt);
          }}
          onEmailSend={handleEmailReceipt}
        />
      )}
    </div>
  );
};