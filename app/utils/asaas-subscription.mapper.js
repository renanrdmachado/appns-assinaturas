/**
 * Utilitários para montar trechos do payload de assinaturas Asaas (DRY)
 */

/**
 * Normaliza dados do titular do cartão, aplicando defaults mínimos.
 * Não valida CEP/telefone – validações ficam a cargo do serviço chamador.
 */
function normalizeHolder(info = {}) {
  const holder = { ...info };
  if (!holder.addressNumber) holder.addressNumber = '0';
  if (!holder.postalCode) holder.postalCode = '00000000';
  // province é opcional; evitar inventar valores para não conflitar com validações
  return holder;
}

/**
 * Monta a seção de cartão do payload, apenas quando billingType é CREDIT_CARD.
 */
function composeCardSection({ billingType, creditCard, creditCardToken, creditCardHolderInfo, remoteIp }) {
  const section = {};
  if ((billingType || '').toUpperCase() !== 'CREDIT_CARD') {
    return section;
  }

  if (creditCardHolderInfo) {
    section.creditCardHolderInfo = normalizeHolder(creditCardHolderInfo);
  }

  if (creditCard) section.creditCard = creditCard;
  if (creditCardToken) section.creditCardToken = creditCardToken;
  if (remoteIp) section.remoteIp = remoteIp;

  return section;
}

module.exports = {
  normalizeHolder,
  composeCardSection,
};
