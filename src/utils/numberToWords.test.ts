import { convertAmountToWords, formatAmountInWords } from './numberToWords';

describe('numberToWords', () => {
  describe('convertAmountToWords', () => {
    test('should convert basic numbers correctly', () => {
      expect(convertAmountToWords(0)).toBe('zéro ariary');
      expect(convertAmountToWords(1)).toBe('un ariary');
      expect(convertAmountToWords(15)).toBe('quinze ariary');
      expect(convertAmountToWords(21)).toBe('vingt et un ariary');
    });

    test('should handle tens correctly', () => {
      expect(convertAmountToWords(70)).toBe('soixante-dix ariary');
      expect(convertAmountToWords(71)).toBe('soixante-onze ariary');
      expect(convertAmountToWords(80)).toBe('quatre-vingt ariary');
      expect(convertAmountToWords(81)).toBe('quatre-vingt-un ariary');
      expect(convertAmountToWords(90)).toBe('quatre-vingt-dix ariary');
      expect(convertAmountToWords(91)).toBe('quatre-vingt-onze ariary');
    });

    test('should handle hundreds correctly', () => {
      expect(convertAmountToWords(100)).toBe('cent ariary');
      expect(convertAmountToWords(101)).toBe('cent un ariary');
      expect(convertAmountToWords(200)).toBe('deux cents ariary');
      expect(convertAmountToWords(1000)).toBe('mille ariary');
      expect(convertAmountToWords(1001)).toBe('mille un ariary');
    });

    test('should handle thousands correctly', () => {
      expect(convertAmountToWords(2000)).toBe('deux mille ariary');
      expect(convertAmountToWords(21000)).toBe('vingt et un mille ariary');
      expect(convertAmountToWords(100000)).toBe('cent mille ariary');
    });

    test('should handle millions correctly', () => {
      expect(convertAmountToWords(1000000)).toBe('un million ariary');
      expect(convertAmountToWords(2000000)).toBe('deux millions ariary');
      expect(convertAmountToWords(1234567)).toBe('un million deux cent trente-quatre mille cinq cent soixante-sept ariary');
    });

    test('should handle edge cases', () => {
      expect(convertAmountToWords(-1)).toBe('montant invalide');
      expect(convertAmountToWords(NaN)).toBe('montant invalide');
    });

    test('should round decimal amounts', () => {
      expect(convertAmountToWords(21.7)).toBe('vingt-deux ariary');
      expect(convertAmountToWords(21.3)).toBe('vingt et un ariary');
    });
  });

  describe('formatAmountInWords', () => {
    test('should format with "Arrêté à la somme de" prefix', () => {
      expect(formatAmountInWords(21000)).toBe('Arrêté à la somme de : vingt et un mille ariary.');
      expect(formatAmountInWords(1500)).toBe('Arrêté à la somme de : mille cinq cents ariary.');
    });
  });
});