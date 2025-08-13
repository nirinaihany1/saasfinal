import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, Printer, RotateCcw, Receipt, User, Calendar, CreditCard } from 'lucide-react';

interface SaleDetailsProps {
  sale: any;
  onClose: () => void;
  onPrint: () => void;
  onRefund: () => void;
}

export const SaleDetails: React.FC<SaleDetailsProps> = ({
  sale,
  onClose,
  onPrint,
  onRefund
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

  const getPaymentLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Espèces',
      card: 'Carte bancaire',
      mvola: 'Mvola',
      orange_money: 'Orange Money',
      airtel_money: 'Airtel Money'
    };
    return labels[method] || method;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" padding="none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Receipt className="w-6 h-6 mr-2" />
            Détails de la vente
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sale Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Receipt className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Numéro de reçu</p>
                  <p className="font-semibold text-gray-900">{sale.receiptNumber}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Date et heure</p>
                  <p className="font-semibold text-gray-900">{formatDate(sale.date)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="font-semibold text-gray-900">{sale.customerName}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Caissier</p>
                  <p className="font-semibold text-gray-900">{sale.cashierName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Articles vendus</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qté</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sous-total (HT):</span>
                <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">TVA (20%):</span>
                <span className="font-medium">{formatCurrency(sale.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total TTC:</span>
                <span className="text-blue-600">{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Méthode de paiement</p>
                <p className="font-semibold text-gray-900">{getPaymentLabel(sale.paymentMethod)}</p>
              </div>
            </div>

            {sale.paymentMethod === 'cash' && sale.changeAmount > 0 && (
              <div>
                <p className="text-sm text-gray-600">Montant reçu</p>
                <p className="font-semibold text-gray-900">{formatCurrency(sale.paymentAmount)}</p>
                <p className="text-sm text-green-600">Rendu: {formatCurrency(sale.changeAmount)}</p>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Statut de la vente</p>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                sale.status === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : sale.status === 'refunded'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {sale.status === 'completed' ? 'Terminée' : 
                 sale.status === 'refunded' ? 'Remboursée' : sale.status}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 p-6 border-t border-gray-200">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onPrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            {sale.status === 'completed' && (
              <Button variant="danger" onClick={onRefund}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Rembourser
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};