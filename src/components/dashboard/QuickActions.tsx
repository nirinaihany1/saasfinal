import React from 'react';
import { Card } from '../ui/Card';
import { ShoppingCart, Package, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Nouvelle vente',
      icon: ShoppingCart,
      color: 'blue',
      onClick: () => navigate('/pos')
    },
    {
      label: 'Ajouter produit',
      icon: Package,
      color: 'green',
      onClick: () => navigate('/products')
    },
    {
      label: 'Nouveau client',
      icon: Users,
      color: 'purple',
      onClick: () => navigate('/customers')
    }
  ];

  return (
    <Card>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h3>
      <div className="space-y-3">
        {actions.map((action, index) => (
          <button 
            key={index}
            onClick={action.onClick}
            className={`w-full p-3 text-left bg-${action.color}-50 hover:bg-${action.color}-100 rounded-lg transition-colors`}
          >
            <div className="flex items-center">
              <action.icon className={`w-5 h-5 text-${action.color}-600`} />
              <span className={`ml-3 font-medium text-${action.color}-700`}>{action.label}</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
};