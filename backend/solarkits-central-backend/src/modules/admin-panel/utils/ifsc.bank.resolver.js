/**
 * ifsc.bank.resolver.js
 *
 * Utility to identify Indian Bank Names from standard 4-letter IFSC code prefixes.
 */

'use strict';

const IFSC_BANK_MAP = {
  ICIC: 'ICICI Bank',
  HDFC: 'HDFC Bank',
  SBIN: 'State Bank of India',
  UTIB: 'Axis Bank',
  KKBK: 'Kotak Mahindra Bank',
  PUNB: 'Punjab National Bank',
  BARB: 'Bank of Baroda',
  YESB: 'Yes Bank',
  IDIB: 'Indian Bank',
  UBIN: 'Union Bank of India',
  CANR: 'Canara Bank',
  CNRB: 'Canara Bank',
  INDB: 'IndusInd Bank',
  MAHB: 'Bank of Maharashtra',
  IDFB: 'IDFC First Bank',
  FDRL: 'Federal Bank',
  IOBA: 'Indian Overseas Bank',
  UCBA: 'UCO Bank',
  BKID: 'Bank of India',
  CBIN: 'Central Bank of India',
  PSIB: 'Punjab & Sind Bank',
  RATN: 'RBL Bank',
  KVBL: 'Karur Vysya Bank',
  SIBL: 'South Indian Bank',
  SCBL: 'Standard Chartered Bank',
  CITI: 'Citibank',
  HSBC: 'HSBC Bank',
  AUBL: 'AU Small Finance Bank',
  ESFB: 'Equitas Small Finance Bank',
  UTKS: 'Utkarsh Small Finance Bank',
  UJVN: 'Ujjivan Small Finance Bank',
  JAKA: 'Jammu & Kashmir Bank',
  BDBL: 'Bandhan Bank',
  CSBK: 'CSB Bank',
  DCBL: 'DCB Bank',
  DLXB: 'Dhanlaxmi Bank',
  TMBL: 'Tamilnad Mercantile Bank',
};

/**
 * Resolves bank name from an IFSC code string.
 * @param {string} ifsc
 * @returns {string} Bank Name or empty string
 */
function resolveBankNameFromIfsc(ifsc) {
  if (!ifsc || typeof ifsc !== 'string') return '';
  const clean = ifsc.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length < 4) return '';
  const prefix = clean.substring(0, 4);
  return IFSC_BANK_MAP[prefix] || '';
}

module.exports = {
  IFSC_BANK_MAP,
  resolveBankNameFromIfsc,
};
