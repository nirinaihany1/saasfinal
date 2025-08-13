import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  X, 
  Printer, 
  Mail, 
  Download, 
  Share2,
  Building,
  Calendar,
  Receipt,
  User,
  Phone
} from 'lucide-react';
import { formatAmountInWords } from '../../utils/numberToWords';
import { getAmountInWords } from '../../utils/numberToWords';
import { sendReceiptByEmail, loadEmailJSConfig } from '../../services/emailService';
import { useAuthStore } from '../../store/authStore';

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ReceiptData {
  receiptNumber: string;
  date: Date;
  cashierName: string;
  customerName?: string;
  customerEmail?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  paymentAmount: number;
  changeAmount: number;
  establishmentInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    nif?: string;
    stat?: string;
  };
}

interface ReceiptGeneratorProps {
  receiptData: ReceiptData;
  onClose: () => void;
  onPrint: () => void;
  onEmailSend?: (email: string) => void;
}

export const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  receiptData,
  onClose,
  onPrint,
  onEmailSend
}) => {
  const [customerEmail, setCustomerEmail] = React.useState(receiptData.customerEmail || '');
  const [showEmailForm, setShowEmailForm] = React.useState(false);
  const [isEmailSending, setIsEmailSending] = React.useState(false);
  
  const { user } = useAuthStore();

  // Charger la configuration EmailJS au montage du composant
  React.useEffect(() => {
    const initEmailJS = async () => {
      if (user?.establishmentId) {
        await loadEmailJSConfig(user.establishmentId);
      }
    };
    
    initEmailJS();
  }, [user?.establishmentId]);

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

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Espèces',
      card: 'Carte bancaire',
      mvola: 'MVola',
      orange_money: 'Orange Money',
      airtel_money: 'Airtel Money'
    };
    return labels[method] || method;
  };

  const handleEmailSend = async () => {
    if (!customerEmail.trim()) {
      alert('Veuillez saisir une adresse email');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(customerEmail)) {
      alert('Format d\'email invalide');
      return;
    }

    setIsEmailSending(true);
    
    try {
      console.log('📧 Tentative d\'envoi d\'email à:', customerEmail);
      
      // Ajouter le montant en lettres aux données du reçu
      const enhancedReceiptData = {
        ...receiptData,
        amountInWords: getAmountInWords(receiptData.total)
      };
      
      const result = await sendReceiptByEmail(enhancedReceiptData, customerEmail);
      
      if (result.success) {
        alert('Email envoyé avec succès !');
        setShowEmailForm(false);
        
        // Appeler la fonction de callback si elle existe
        if (onEmailSend) {
          onEmailSend(customerEmail);
        }
      } else {
        alert(`Erreur lors de l'envoi de l'email: ${result.message}`);
        console.error('Détails de l\'erreur:', result.error);
      }
    } catch (error) {
      console.error('Erreur inattendue lors de l\'envoi:', error);
      alert('Erreur inattendue lors de l\'envoi de l\'email');
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleDownloadPDF = () => {
    // Créer le contenu HTML du reçu
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reçu ${receiptData.receiptNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .company-info { font-size: 12px; line-height: 1.4; }
          .receipt-info { margin: 15px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .items-table th, .items-table td { text-align: left; padding: 5px 0; border-bottom: 1px dashed #ccc; }
          .items-table th { font-weight: bold; }
          .total-section { border-top: 2px solid #000; padding-top: 10px; margin-top: 15px; }
          .total-line { display: flex; justify-content: space-between; margin: 3px 0; }
          .grand-total { font-weight: bold; font-size: 16px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; font-size: 12px; }
          .amount-in-words { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-style: italic; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${receiptData.establishmentInfo.name}</div>
          <div class="company-info">
            ${receiptData.establishmentInfo.address}<br>
            Tél: ${receiptData.establishmentInfo.phone}<br>
            Email: ${receiptData.establishmentInfo.email}
            ${receiptData.establishmentInfo.nif ? `<br>NIF: ${receiptData.establishmentInfo.nif}` : ''}
            ${receiptData.establishmentInfo.stat ? `<br>STAT: ${receiptData.establishmentInfo.stat}` : ''}
          </div>
        </div>
        
        <div class="receipt-info">
          <div><strong>Reçu N°:</strong> ${receiptData.receiptNumber}</div>
          <div><strong>Date:</strong> ${formatDate(receiptData.date)}</div>
          <div><strong>Caissier:</strong> ${receiptData.cashierName}</div>
          ${receiptData.customerName ? `<div><strong>Client:</strong> ${receiptData.customerName}</div>` : ''}
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Qté</th>
              <th>P.U.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${receiptData.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-section">
          <div class="total-line">
            <span>Sous-total (HT):</span>
            <span>${formatCurrency(receiptData.subtotal)}</span>
          </div>
          <div class="total-line">
            <span>TVA (20%):</span>
            <span>${formatCurrency(receiptData.taxAmount)}</span>
          </div>
          <div class="total-line grand-total">
            <span>TOTAL TTC:</span>
            <span>${formatCurrency(receiptData.total)}</span>
          </div>
          
          <div style="margin-top: 15px;">
            <div class="total-line">
              <span>Paiement (${getPaymentMethodLabel(receiptData.paymentMethod)}):</span>
              <span>${formatCurrency(receiptData.paymentAmount)}</span>
            </div>
            ${receiptData.changeAmount > 0 ? `
              <div class="total-line">
                <span>Rendu:</span>
                <span>${formatCurrency(receiptData.changeAmount)}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="amount-in-words">
            ${formatAmountInWords(receiptData.total)}
          </div>
        </div>
        
        <div class="footer">
          <div>Merci de votre visite !</div>
          <div style="margin-top: 10px; font-size: 10px;">
            Conservez ce reçu pour tout échange ou remboursement
          </div>
        </div>
      </body>
      </html>
    `;

    // Créer un blob et télécharger
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recu_${receiptData.receiptNumber}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto" padding="none">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Receipt className="w-5 h-5 mr-2" />
            Reçu de vente
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aperçu du reçu */}
        <div className="p-4 bg-gray-50 font-mono text-sm">
          {/* En-tête établissement */}
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <div className="font-bold text-lg">{receiptData.establishmentInfo.name}</div>
            <div className="text-xs mt-1">
              {receiptData.establishmentInfo.address}<br />
              Tél: {receiptData.establishmentInfo.phone}<br />
              Email: {receiptData.establishmentInfo.email}
              {receiptData.establishmentInfo.nif && (
                <>
                  <br />NIF: {receiptData.establishmentInfo.nif}
                </>
              )}
              {receiptData.establishmentInfo.stat && (
                <>
                  <br />STAT: {receiptData.establishmentInfo.stat}
                </>
              )}
            </div>
          </div>

          {/* Informations de vente */}
          <div className="mb-4 text-xs">
            <div className="flex justify-between">
              <span>Reçu N°:</span>
              <span className="font-bold">{receiptData.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(receiptData.date)}</span>
            </div>
            <div className="flex justify-between">
              <span>Caissier:</span>
              <span>{receiptData.cashierName}</span>
            </div>
            {receiptData.customerName && (
              <div className="flex justify-between">
                <span>Client:</span>
                <span>{receiptData.customerName}</span>
              </div>
            )}
          </div>

          {/* Articles */}
          <div className="border-t border-dashed border-gray-400 pt-2 mb-4">
            <div className="grid grid-cols-4 gap-1 text-xs font-bold mb-2">
              <span>Article</span>
              <span className="text-center">Qté</span>
              <span className="text-right">P.U.</span>
              <span className="text-right">Total</span>
            </div>
            {receiptData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-1 text-xs mb-1">
                <span className="truncate">{item.name}</span>
                <span className="text-center">{item.quantity}</span>
                <span className="text-right">{formatCurrency(item.unitPrice)}</span>
                <span className="text-right font-semibold">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>

          {/* Totaux */}
          <div className="border-t-2 border-black pt-2 text-xs">
            <div className="flex justify-between">
              <span>Sous-total (HT):</span>
              <span>{formatCurrency(receiptData.subtotal)}</span>
            </div>
            {receiptData.taxAmount > 0 && (
  <div className="flex justify-between">
    <span>TVA (20%):</span>
    <span>{formatCurrency(receiptData.taxAmount)}</span>
  </div>
)}
            <div className="flex justify-between font-bold text-base border-t border-dashed border-gray-400 pt-1 mt-1">
              <span>TOTAL TTC:</span>
              <span>{formatCurrency(receiptData.total)}</span>
            </div>
            
            <div className="mt-3 pt-2 border-t border-dashed border-gray-400">
              <div className="flex justify-between">
                <span>Paiement ({getPaymentMethodLabel(receiptData.paymentMethod)}):</span>
                <span>{formatCurrency(receiptData.paymentAmount)}</span>
              </div>
              {receiptData.changeAmount > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Rendu:</span>
                  <span>{formatCurrency(receiptData.changeAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pied de page */}
          <div className="text-center mt-4 pt-3 border-t-2 border-black text-xs">
            <div className="font-semibold">Merci de votre visite !</div>
            <div className="mt-2 text-xs">
              Conservez ce reçu pour tout échange ou remboursement
            </div>
            <div className="mt-3 pt-2 border-t border-dashed border-gray-400 text-xs italic">
              {formatAmountInWords(receiptData.total)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={onPrint} className="flex items-center justify-center">
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            <Button variant="ghost" onClick={handleDownloadPDF} className="flex items-center justify-center">
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>

          {!showEmailForm ? (
            <Button 
              fullWidth 
              variant="outline" 
              onClick={() => setShowEmailForm(true)}
              className="flex items-center justify-center"
            >
              <Mail className="w-4 h-4 mr-2" />
              Envoyer par email
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email du client
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowEmailForm(false)}
                  disabled={isEmailSending}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleEmailSend}
                  disabled={isEmailSending || !customerEmail.trim()}
                  className="flex-1"
                >
                  {isEmailSending ? 'Envoi en cours...' : 'Envoyer'}
                </Button>
              </div>
            </div>
          )}

          <Button variant="ghost" fullWidth onClick={onClose}>
            Fermer
          </Button>
        </div>
      </Card>
    </div>
  );
};