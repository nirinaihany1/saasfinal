import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Crown, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

interface SubscriptionStatusProps {
  subscription: {
    plan: string;
    status: string;
    endDate: Date;
    daysLeft: number;
  };
  onUpgrade: () => void;
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  subscription,
  onUpgrade
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trial': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'trial': return <Clock className="w-5 h-5" />;
      case 'active': return <CheckCircle className="w-5 h-5" />;
      case 'expired': return <AlertTriangle className="w-5 h-5" />;
      case 'suspended': return <AlertTriangle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'trial': return 'Période d\'essai';
      case 'active': return 'Actif';
      case 'expired': return 'Expiré';
      case 'suspended': return 'Suspendu';
      default: return status;
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'starter': return 'Starter';
      case 'business': return 'Business';
      case 'enterprise': return 'Enterprise';
      case 'trial': return 'Essai gratuit';
      default: return plan;
    }
  };

  const isExpiringSoon = subscription.daysLeft <= 7;
  const isExpired = subscription.daysLeft <= 0;

  return (
    <Card className={`${isExpiringSoon ? 'border-orange-200 bg-orange-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${
            subscription.status === 'active' ? 'bg-green-100' : 
            subscription.status === 'trial' ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Crown className={`w-8 h-8 ${
              subscription.status === 'active' ? 'text-green-600' : 
              subscription.status === 'trial' ? 'text-blue-600' : 'text-gray-600'
            }`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Plan {getPlanLabel(subscription.plan)}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusIcon(subscription.status)}
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(subscription.status)}`}>
                {getStatusLabel(subscription.status)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center text-gray-600 mb-1">
            <Calendar className="w-4 h-4 mr-1" />
            <span className="text-sm">
              {isExpired ? 'Expiré le' : 'Expire le'}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {subscription.endDate.toLocaleDateString('fr-FR')}
          </p>
          <p className={`text-sm font-medium ${
            isExpired ? 'text-red-600' : 
            isExpiringSoon ? 'text-orange-600' : 'text-green-600'
          }`}>
            {isExpired ? 'Expiré' : `${subscription.daysLeft} jours restants`}
          </p>
        </div>
      </div>

      {(isExpiringSoon || isExpired) && (
        <div className="mt-4 p-4 bg-orange-100 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-orange-800">
                {isExpired ? 'Abonnement expiré' : 'Abonnement bientôt expiré'}
              </h4>
              <p className="text-sm text-orange-700 mt-1">
                {isExpired 
                  ? 'Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser toutes les fonctionnalités.'
                  : `Votre abonnement expire dans ${subscription.daysLeft} jours. Renouvelez-le pour éviter toute interruption de service.`
                }
              </p>
              <Button 
                size="sm" 
                className="mt-3"
                onClick={onUpgrade}
              >
                <Zap className="w-4 h-4 mr-2" />
                {isExpired ? 'Renouveler maintenant' : 'Renouveler l\'abonnement'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {subscription.status === 'trial' && !isExpiringSoon && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-800">Période d'essai active</h4>
              <p className="text-sm text-blue-700 mt-1">
                Profitez de toutes les fonctionnalités gratuitement pendant votre période d'essai. 
                Vous pourrez choisir un plan avant la fin de votre essai.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};