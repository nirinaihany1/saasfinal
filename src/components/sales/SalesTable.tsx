import React from 'react';
import { Button } from '../ui/Button';
import { 
  Receipt, 
  Eye, 
  Printer, 
  RotateCcw,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';

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

interface SalesTableProps {
  sales: Sale[];
  onView: (sale: Sale) => void;
  onPrint: (sale: Sale) => void;
  onRefund: (saleId: string) => void;
  isLoading?: boolean;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onView,
  onPrint,
  onRefund,
  isLoading = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune vente trouvée</h3>
          <p className="text-gray-500">Aucune vente ne correspond à vos critères de recherche</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client & Caissier
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
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales.map((sale) => {
              const PaymentIcon = getPaymentIcon(sale.paymentMethod);

              return (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <Receipt className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sale.receiptNumber}</div>
                        <div className="text-sm text-gray-500">{formatDate(sale.date)}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{sale.customerName}</div>
                      <div className="text-gray-500">par {sale.cashierName}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {sale.items.reduce((sum, item) => sum + item.quantity, 0)} articles
                      </div>
                      <div className="text-gray-500 text-xs">
                        {sale.items.slice(0, 2).map(item => item.name).join(', ')}
                        {sale.items.length > 2 && '...'}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm">
                      <PaymentIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">{getPaymentLabel(sale.paymentMethod)}</div>
                        {sale.changeAmount > 0 && (
                          <div className="text-gray-500 text-xs">
                            Rendu: {formatCurrency(sale.changeAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-bold text-gray-900">{formatCurrency(sale.total)}</div>
                      <div className="text-gray-500 text-xs">
                        HT: {formatCurrency(sale.subtotal)}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : sale.status === 'refunded'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {sale.status === 'completed' ? 'Terminée' : 
                       sale.status === 'refunded' ? 'Remboursée' : sale.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(sale)}
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPrint(sale)}
                        title="Imprimer le reçu"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {sale.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRefund(sale.id)}
                          title="Rembourser"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};