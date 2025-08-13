import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
  X, 
  Upload, 
  Smartphone, 
  CreditCard, 
  Building,
  Banknote,
  AlertCircle
} from 'lucide-react';

interface PaymentRequestFormProps {
  subscriptionId: string;
  amount: number;
  onSubmit: (paymentData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const paymentMethods = [
  {
    id: 'mvola',
    name: 'MVola',
    icon: Smartphone,
    color: 'text-red-600',
    instructions: 'Envoyez le montant au numéro MVola : +261 34 XX XXX XX'
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    icon: Smartphone,
    color: 'text-orange-600',
    instructions: 'Envoyez le montant au numéro Orange Money : +261 32 XX XXX XX'
  },
  {
    id: 'airtel_money',
    name: 'Airtel Money',
    icon: Smartphone,
    color: 'text-red-600',
    instructions: 'Envoyez le montant au numéro Airtel Money : +261 33 XX XXX XX'
  },
  {
    id: 'bank_transfer',
    name: 'Virement bancaire',
    icon: Building,
    color: 'text-blue-600',
    instructions: 'Effectuez un virement vers : BNI Madagascar - Compte : 12345678901'
  },
  {
    id: 'cash',
    name: 'Espèces',
    icon: Banknote,
    color: 'text-green-600',
    instructions: 'Déposez le montant dans nos bureaux à Antananarivo'
  }
];

export const PaymentRequestForm: React.FC<PaymentRequestFormProps> = ({
  subscriptionId,
  amount,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    paymentMethod: 'mvola',
    paymentReference: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const selectedMethod = paymentMethods.find(m => m.id === formData.paymentMethod);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.paymentReference.trim()) {
      newErrors.paymentReference = 'La référence de paiement est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        subscriptionId,
        amount,
        ...formData
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" padding="none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Demande de paiement
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
            {/* Montant */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-blue-900">Montant à payer</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {formatCurrency(amount)}
                </p>
              </div>
            </div>

            {/* Méthode de paiement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Méthode de paiement *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleChange('paymentMethod', method.id)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.paymentMethod === method.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-6 h-6 ${method.color}`} />
                        <span className="font-medium text-gray-900">{method.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instructions de paiement */}
            {selectedMethod && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Instructions de paiement</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {selectedMethod.instructions}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Référence de paiement */}
            <Input
              label="Référence de paiement *"
              value={formData.paymentReference}
              onChange={(e) => handleChange('paymentReference', e.target.value)}
              error={errors.paymentReference}
              placeholder="Ex: Transaction ID, numéro de reçu, etc."
              leftIcon={<CreditCard className="w-4 h-4" />}
            />

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Informations supplémentaires sur le paiement..."
              />
            </div>

            {/* Upload preuve de paiement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preuve de paiement (optionnel)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Téléchargez une capture d'écran ou photo du reçu
                </p>
                <Button variant="ghost" size="sm" type="button">
                  Choisir un fichier
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Formats acceptés: JPG, PNG, PDF (max 5MB)
                </p>
              </div>
            </div>

            {/* Avertissement */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">⏰ Délai de traitement</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• MVola/Orange Money/Airtel Money: 2-4 heures ouvrables</li>
                <li>• Virement bancaire: 1-2 jours ouvrables</li>
                <li>• Espèces: Immédiat lors du dépôt</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Envoi en cours...' : 'Envoyer la demande'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};