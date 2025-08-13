import React from 'react';
import { AlertCircle, ArrowUpRight } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

interface FirebaseIndexHelperProps {
  indexUrl: string;
  title?: string;
  description?: string;
}

export const FirebaseIndexHelper: React.FC<FirebaseIndexHelperProps> = ({
  indexUrl,
  title = "Index de base de données requis",
  description = "Pour des performances optimales, un index composite doit être créé dans Firebase. Les données sont actuellement chargées avec une méthode alternative."
}) => {
  return (
    <Card padding="md">
      <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800">{title}</h4>
          <p className="text-sm text-amber-700 mt-1">
            {description}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-amber-800 hover:text-amber-900 hover:bg-amber-100"
            onClick={() => window.open(indexUrl, '_blank')}
          >
            Créer l'index maintenant
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
};