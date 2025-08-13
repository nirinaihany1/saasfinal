import React, { useState, useEffect } from 'react';
import { CategoryManagement } from '../components/categories/CategoryManagement';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Tag, AlertTriangle } from 'lucide-react';

export const Categories: React.FC = () => {
  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'reader';

  if (isReadOnly) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Accès en lecture seule</h3>
            <p className="text-gray-600 mb-4">
              En tant que Lecteur, vous pouvez uniquement consulter les catégories mais pas les modifier.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Permissions limitées</p>
                  <p className="mt-1">
                    Votre rôle actuel ne permet pas de créer, modifier ou supprimer des catégories.
                    Contactez un administrateur si vous avez besoin de ces permissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        <CategoryManagement readOnly={true} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CategoryManagement readOnly={false} />
    </div>
  );
};