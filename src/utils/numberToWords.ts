/**
 * Utilitaire de conversion des nombres en lettres (français - Madagascar)
 * Convertit un montant numérique en sa représentation textuelle
 */

const units = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'
];

const tens = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'
];

const scales = [
  { value: 1000000000, name: 'milliard' },
  { value: 1000000, name: 'million' },
  { value: 1000, name: 'mille' },
  { value: 100, name: 'cent' }
];

/**
 * Convertit un nombre entre 0 et 99 en lettres
 */
function convertTens(num: number): string {
  if (num < 20) {
    return units[num];
  }
  
  const tensDigit = Math.floor(num / 10);
  const unitsDigit = num % 10;
  
  if (tensDigit === 7) {
    // Cas spécial pour 70-79
    return unitsDigit === 0 ? 'soixante-dix' : `soixante-${units[10 + unitsDigit]}`;
  } else if (tensDigit === 9) {
    // Cas spécial pour 90-99
    return unitsDigit === 0 ? 'quatre-vingt-dix' : `quatre-vingt-${units[10 + unitsDigit]}`;
  } else {
    const tensWord = tens[tensDigit];
    if (unitsDigit === 0) {
      return tensWord;
    } else if (unitsDigit === 1 && (tensDigit === 2 || tensDigit === 3 || tensDigit === 4 || tensDigit === 5 || tensDigit === 6)) {
      return `${tensWord} et un`;
    } else {
      return `${tensWord}-${units[unitsDigit]}`;
    }
  }
}

/**
 * Convertit un nombre entre 0 et 999 en lettres
 */
function convertHundreds(num: number): string {
  if (num === 0) return '';
  
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  
  let result = '';
  
  if (hundreds > 0) {
    if (hundreds === 1) {
      result = 'cent';
    } else {
      result = `${units[hundreds]} cents`;
    }
  }
  
  if (remainder > 0) {
    const remainderWords = convertTens(remainder);
    if (result) {
      result += ` ${remainderWords}`;
    } else {
      result = remainderWords;
    }
  }
  
  return result;
}

/**
 * Convertit un nombre entier en lettres
 */
function convertInteger(num: number): string {
  if (num === 0) return 'zéro';
  
  let result = '';
  let remaining = num;
  
  for (const scale of scales) {
    const scaleValue = Math.floor(remaining / scale.value);
    
    if (scaleValue > 0) {
      const scaleWords = convertHundreds(scaleValue);
      
      if (scale.value === 1000) {
        // Cas spécial pour "mille"
        if (scaleValue === 1) {
          result += 'mille ';
        } else {
          result += `${scaleWords} mille `;
        }
      } else {
        // Pour millions et milliards
        result += `${scaleWords} ${scale.name}`;
        if (scaleValue > 1) {
          result += 's';
        }
        result += ' ';
      }
      
      remaining %= scale.value;
    }
  }
  
  // Ajouter les centaines, dizaines et unités restantes
  if (remaining > 0) {
    result += convertHundreds(remaining);
  }
  
  return result.trim();
}

/**
 * Convertit un montant en ariary en lettres
 * @param amount - Le montant en ariary (peut contenir des décimales)
 * @returns Le montant en lettres avec la devise
 */
export function convertAmountToWords(amount: number): string {
  if (isNaN(amount) || amount < 0) {
    return 'montant invalide';
  }
  
  // Arrondir à l'ariary le plus proche (pas de centimes en ariary)
  const roundedAmount = Math.round(amount);
  
  if (roundedAmount === 0) {
    return 'zéro ariary';
  }
  
  const amountInWords = convertInteger(roundedAmount);
  
  // Ajouter la devise
  if (roundedAmount === 1) {
    return `${amountInWords} ariary`;
  } else {
    return `${amountInWords} ariary`;
  }
}

/**
 * Formate le texte "Arrêté à la somme de" pour les reçus
 * @param amount - Le montant en ariary
 * @returns Le texte formaté complet
 */
export function formatAmountInWords(amount: number): string {
  const amountInWords = convertAmountToWords(amount);
  return `Arrêté à la somme de : ${amountInWords}.`;
}

/**
 * Convertit un montant en ariary en lettres (format simple pour EmailJS)
 * @param amount - Le montant en ariary
 * @returns Le montant en lettres sans préfixe
 */
export function getAmountInWords(amount: number): string {
  return convertAmountToWords(amount);
}

/**
 * Fonction de test pour vérifier la conversion
 */
export function testNumberToWords() {
  const testCases = [
    0, 1, 15, 21, 70, 71, 80, 81, 90, 91, 99, 100, 101, 200, 1000, 1001, 1100, 
    2000, 10000, 21000, 100000, 1000000, 1234567
  ];
  
  console.log('Tests de conversion nombre → lettres:');
  testCases.forEach(num => {
    console.log(`${num} → ${convertAmountToWords(num)}`);
  });
}