import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Check, 
  Star, 
  Users, 
  Package, 
  BarChart3,
  Shield,
  Headphones,
  Zap
} from 'lucide-react';
import { SubscriptionPlan } from '../../types/subscription';

const plans: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 15000,
    maxUsers: 2,
    maxProducts: 100,
    features: [
      'Point de vente basique',
      'Gestion des produits',
      'Gestion des clients',
      'Rapports simples',
      'Support par email'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    price: 35000,
    maxUsers: 10,
    maxProducts: 1000,
    isPopular: true,
    features: [
      'Toutes les fonctionnalités Starter',
      'Gestion des dépenses',
      'Rapports avancés',
      'Gestion multi-utilisateurs',
      'Sauvegarde automatique',
      'Support prioritaire'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 75000,
    maxUsers: -1, // Illimité
    maxProducts: -1, // Illimité
    features: [
      'Toutes les fonctionnalités Business',
      'Établissements multiples',
      'API Access',
      'Formations personnalisées',
      'Support dédié 24/7',
      'Personnalisation avancée'
    ]
  }
];

interface SubscriptionPlansProps {
  onSelectPlan: (planId: string) => void;
  currentPlan?: string;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onSelectPlan,
  currentPlan
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('utilisateur')) return <Users className="w-4 h-4" />;
    if (feature.includes('produit')) return <Package className="w-4 h-4" />;
    if (feature.includes('rapport')) return <BarChart3 className="w-4 h-4" />;
    if (feature.includes('support')) return <Headphones className="w-4 h-4" />;
    if (feature.includes('API')) return <Zap className="w-4 h-4" />;
    return <Check className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choisissez votre plan d'abonnement
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Sélectionnez le plan qui correspond le mieux aux besoins de votre établissement.
          Tous les plans incluent 14 jours d'essai gratuit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.id}
            className={`relative ${
              plan.isPopular 
                ? 'border-blue-500 shadow-lg scale-105' 
                : 'border-gray-200'
            }`}
            padding="lg"
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  Plus populaire
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-blue-600">
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-gray-600">/mois</span>
              </div>
              
              <div className="flex justify-center space-x-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {plan.maxUsers === -1 ? 'Illimité' : `${plan.maxUsers} utilisateurs`}
                </div>
                <div className="flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  {plan.maxProducts === -1 ? 'Illimité' : `${plan.maxProducts} produits`}
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getFeatureIcon(feature)}
                  </div>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              fullWidth
              variant={plan.isPopular ? 'primary' : 'ghost'}
              onClick={() => onSelectPlan(plan.id)}
              disabled={currentPlan === plan.id}
            >
              {currentPlan === plan.id ? 'Plan actuel' : 'Choisir ce plan'}
            </Button>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-gray-600">
        <p>💡 Tous les plans incluent 14 jours d'essai gratuit</p>
        <p>🔒 Paiement sécurisé • 📞 Support en français • 🇲🇬 Adapté pour Madagascar</p>
      </div>
    </div>
  );
};