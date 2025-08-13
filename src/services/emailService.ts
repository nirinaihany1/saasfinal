import emailjs from '@emailjs/browser';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Interface pour la configuration EmailJS
interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

// Configuration globale EmailJS
let globalEmailJSConfig: EmailJSConfig = {
  serviceId: 'ton_service_id',
  templateId: 'ton_template_id',
  publicKey: 'ton_public_key'
};

// Fonction pour charger la configuration depuis Firestore
export const loadEmailJSConfig = async (establishmentId: string): Promise<boolean> => {
  try {
    const configDoc = await getDoc(doc(db, 'emailConfigs', establishmentId));
    
    if (configDoc.exists()) {
      const config = configDoc.data() as EmailJSConfig;
      globalEmailJSConfig = config;
      
      // Initialiser EmailJS avec la clé publique
      if (config.publicKey && config.publicKey !== 'ton_public_key') {
        emailjs.init(config.publicKey);
        console.log('✅ EmailJS initialisé avec la configuration depuis Firestore');
      }
      
      return true;
    } else {
      console.log('ℹ️ Aucune configuration EmailJS trouvée dans Firestore');
      return false;
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration EmailJS:', error);
    return false;
  }
};

// Fonction pour obtenir la configuration actuelle
export const getEmailJSConfig = (): EmailJSConfig => {
  return globalEmailJSConfig;
};

// Fonction pour mettre à jour la configuration
export const updateEmailJSConfig = async (
  establishmentId: string, 
  serviceId: string, 
  templateId: string, 
  publicKey: string
): Promise<{ saved: boolean; error?: any }> => {
  try {
    const config: EmailJSConfig = {
      serviceId,
      templateId,
      publicKey
    };
    
    // Mettre à jour la configuration globale
    globalEmailJSConfig = config;
    
    // Initialiser EmailJS avec la nouvelle clé publique
    if (publicKey && publicKey !== 'ton_public_key') {
      emailjs.init(publicKey);
      console.log('✅ EmailJS initialisé avec la nouvelle configuration');
    }
    
    // Sauvegarder dans Firestore
    await setDoc(doc(db, 'emailConfigs', establishmentId), config);
    
    return { saved: true };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration EmailJS:', error);
    return { saved: false, error };
  }
};

// Fonction pour tester la configuration EmailJS
export const testEmailJSConfiguration = async (): Promise<{ success: boolean; message: string; error?: any }> => {
  try {
    const config = getEmailJSConfig();
    
    if (!config.serviceId || !config.templateId || !config.publicKey ||
        config.serviceId === 'ton_service_id' || 
        config.templateId === 'ton_template_id' || 
        config.publicKey === 'ton_public_key') {
      return {
        success: false,
        message: 'Configuration EmailJS incomplète ou non configurée'
      };
    }
    
    // Paramètres de test
    const templateParams = {
      to_email: 'test@example.com',
      to_name: 'Test',
      establishment_name: 'Test Establishment',
      receipt_number: 'TEST-001',
      date: new Date().toLocaleDateString('fr-FR'),
      total_amount: '1000 Ar',
      items_content: 'Article de test x1 - 1000 Ar',
      payment_method: 'Test'
    };
    
    // Envoyer l'email de test
    await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );
    
    return {
      success: true,
      message: 'Configuration EmailJS valide - Email de test envoyé'
    };
  } catch (error) {
    console.error('Erreur lors du test EmailJS:', error);
    return {
      success: false,
      message: 'Erreur lors du test de configuration',
      error
    };
  }
};

// Fonction pour envoyer un reçu par email
export const sendReceiptByEmail = async (
  receiptData: any,
  customerEmail: string
): Promise<{ success: boolean; message: string; error?: any }> => {
  try {
    const config = getEmailJSConfig();
    
    if (!config.serviceId || !config.templateId || !config.publicKey ||
        config.serviceId === 'ton_service_id' || 
        config.templateId === 'ton_template_id' || 
        config.publicKey === 'ton_public_key') {
      return {
        success: false,
        message: 'EmailJS n\'est pas configuré. Veuillez configurer EmailJS dans les paramètres.'
      };
    }
    
    // Formater les articles pour l'email en HTML (tableau)
    const itemsContent = receiptData.items.map((item: any) => 
      `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${new Intl.NumberFormat('mg-MG', {
        style: 'currency',
        currency: 'MGA',
        minimumFractionDigits: 0
      }).format(item.unitPrice).replace('MGA', 'Ar')}</td><td>${new Intl.NumberFormat('mg-MG', {
        style: 'currency',
        currency: 'MGA',
        minimumFractionDigits: 0
      }).format(item.total).replace('MGA', 'Ar')}</td></tr>`
    ).join('');
    
    // Formater les montants
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('mg-MG', {
        style: 'currency',
        currency: 'MGA',
        minimumFractionDigits: 0
      }).format(amount).replace('MGA', 'Ar');
    };
    
    // Obtenir le libellé de la méthode de paiement
    const getPaymentMethodLabel = (method: string) => {
      const labels: Record<string, string> = {
        cash: 'Espèces',
        card: 'Carte bancaire',
        mvola: 'Mvola',
        orange_money: 'Orange Money',
        airtel_money: 'Airtel Money'
      };
      return labels[method] || method;
    };
    
    // Paramètres du template
    const templateParams = {
      establishment_name: receiptData.establishmentInfo.name,
      establishment_address: receiptData.establishmentInfo.address,
      establishment_phone: receiptData.establishmentInfo.phone,
      establishment_email: receiptData.establishmentInfo.email,
      establishment_nif: receiptData.establishmentInfo.nif || '',
      establishment_stat: receiptData.establishmentInfo.stat || '',
      receipt_number: receiptData.receiptNumber,
      date: receiptData.date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      cashier_name: receiptData.cashierName,
      customer_name: receiptData.customerName || 'Client anonyme',
      items_content: itemsContent,
      subtotal: formatAmount(receiptData.subtotal),
      tax_amount: formatAmount(receiptData.taxAmount),
      total_amount: formatAmount(receiptData.total),
      payment_method: getPaymentMethodLabel(receiptData.paymentMethod),
      payment_amount: formatAmount(receiptData.paymentAmount),
      change_amount: receiptData.changeAmount > 0 ? formatAmount(receiptData.changeAmount) : '0 Ar',
      amount_in_words: receiptData.amountInWords || '',
      // Paramètres EmailJS standards
      to_email: customerEmail,
      to_name: receiptData.customerName || 'Client'
    };
    
    // Envoyer l'email
    await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );
    
    return {
      success: true,
      message: 'Reçu envoyé par email avec succès'
    };
  } catch (error) {
    console.error('Erreur lors de l\'envoi du reçu par email:', error);
    return {
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email',
      error
    };
  }
};