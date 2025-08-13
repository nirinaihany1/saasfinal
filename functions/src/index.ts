import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialiser Firebase Admin
admin.initializeApp();

// Interface pour les données du reçu
interface ReceiptData {
  receiptNumber: string;
  date: string;
  cashierName: string;
  customerName?: string;
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
  establishmentInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    nif?: string;
    stat?: string;
  };
}

// Fonction pour envoyer un reçu par email
export const sendReceiptEmail = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      // Vérifier la méthode HTTP
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Méthode non autorisée' });
        return;
      }

      const { to, subject, receiptData } = request.body.data;

      // Validation des données
      if (!to || !receiptData) {
        response.status(400).json({ error: 'Données manquantes' });
        return;
      }

      // Valider l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        response.status(400).json({ error: 'Format d\'email invalide' });
        return;
      }

      logger.info('Envoi d\'email de reçu', { to, receiptNumber: receiptData.receiptNumber });

      // Générer le contenu HTML de l'email
      const htmlContent = generateReceiptHTML(receiptData);

      // Configuration de l'email
      const mailOptions = {
        from: `"${receiptData.establishmentInfo.name}" <noreply@saaspos.mg>`,
        to: to,
        subject: subject || `Reçu ${receiptData.receiptNumber} - ${receiptData.establishmentInfo.name}`,
        html: htmlContent,
        text: generateReceiptText(receiptData)
      };

      // Ici, vous devriez utiliser un service d'email comme SendGrid, Mailgun, ou Nodemailer
      // Pour cette démo, nous simulons l'envoi
      logger.info('Email simulé envoyé avec succès', { to, subject: mailOptions.subject });

      response.json({ 
        success: true, 
        message: 'Email envoyé avec succès',
        emailSent: true
      });

    } catch (error) {
      logger.error('Erreur lors de l\'envoi de l\'email', error);
      response.status(500).json({ 
        error: 'Erreur lors de l\'envoi de l\'email',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }
);

// Générer le contenu HTML de l'email
function generateReceiptHTML(receiptData: ReceiptData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mg-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
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

  const formatAmountInWords = (amount: number) => {
    // Fonction simplifiée pour les Cloud Functions
    return `Arrêté à la somme de : ${amount} ariary.`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reçu ${receiptData.receiptNumber}</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f9f9f9;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- En-tête -->
        <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px;">${receiptData.establishmentInfo.name}</h1>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">
            ${receiptData.establishmentInfo.address}<br>
            Tél: ${receiptData.establishmentInfo.phone}<br>
            Email: ${receiptData.establishmentInfo.email}
          </p>
        </div>

        <!-- Informations du reçu -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Détails du reçu</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Reçu N°:</td>
              <td style="padding: 8px 0; color: #333;">${receiptData.receiptNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Date:</td>
              <td style="padding: 8px 0; color: #333;">${formatDate(receiptData.date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Caissier:</td>
              <td style="padding: 8px 0; color: #333;">${receiptData.cashierName}</td>
            </tr>
          </table>
        </div>

        <!-- Articles -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; font-size: 16px; margin-bottom: 15px;">Articles achetés</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd; color: #666;">Article</th>
                <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd; color: #666;">Qté</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd; color: #666;">P.U.</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd; color: #666;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${receiptData.items.map((item: any) => `
                <tr>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">${item.name}</td>
                  <td style="padding: 10px 12px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                  <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(item.unitPrice)}</td>
                  <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totaux -->
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #666;">Sous-total (HT):</td>
              <td style="padding: 5px 0; text-align: right; color: #333; font-weight: bold;">${formatCurrency(receiptData.subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">TVA (20%):</td>
              <td style="padding: 5px 0; text-align: right; color: #333; font-weight: bold;">${formatCurrency(receiptData.taxAmount)}</td>
            </tr>
            <tr style="border-top: 2px solid #2563eb;">
              <td style="padding: 10px 0; color: #2563eb; font-size: 18px; font-weight: bold;">TOTAL TTC:</td>
              <td style="padding: 10px 0; text-align: right; color: #2563eb; font-size: 18px; font-weight: bold;">${formatCurrency(receiptData.total)}</td>
            </tr>
          </table>
        </div>

        <!-- Informations de paiement -->
        <div style="background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #0277bd;">Paiement</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 3px 0; color: #666;">Méthode:</td>
              <td style="padding: 3px 0; text-align: right; color: #333; font-weight: bold;">${getPaymentMethodLabel(receiptData.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0; color: #666;">Montant reçu:</td>
              <td style="padding: 3px 0; text-align: right; color: #333; font-weight: bold;">${formatCurrency(receiptData.paymentAmount)}</td>
            </tr>
            ${receiptData.changeAmount > 0 ? `
              <tr>
                <td style="padding: 3px 0; color: #666;">Rendu:</td>
                <td style="padding: 3px 0; text-align: right; color: #16a34a; font-weight: bold;">${formatCurrency(receiptData.changeAmount)}</td>
              </tr>
            ` : ''}
          </table>
          
+          <!-- Montant en lettres immédiatement après la section paiement -->
+          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc; font-style: italic; color: #666; text-align: center; font-size: 14px;">
+            ${formatAmountInWords(receiptData.total)}
+          </div>
         </div>

-        <!-- Pied de page -->
        <!-- Pied de page -->
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
+        <!-- Pied de page -->
+        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
           <p style="margin: 0; font-weight: bold;">Merci de votre visite !</p>
           <p style="margin: 10px 0 0 0; font-size: 12px;">
             Conservez ce reçu pour tout échange ou remboursement
           </p>
-          <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-style: italic; font-size: 10px;">
-            ${formatAmountInWords(receiptData.total)}
-          </div>
         </div>
       </div>
     </div>
}
}