# Refatoração - SellerSubAccountService

## Problema atual
- Múltiplas tentativas de retry (1, 2, 2b, 2c, 3) espalhadas pelo código
- Extração de dados (`accessToken?.apiKey`) repetida 6+ vezes
- Falta clareza: quais dados vêm de onde, o que é extraído
- Métodos muito grandes (200+ linhas) com múltiplas responsabilidades

## Solução - 3 métodos privados CLAROS

### 1. `_extractSubaccountData(apiResponse)` → Private
**Responsabilidade**: Extrair campos da resposta da API Asaas
**Entrada**: Resposta bruta da API
**Saída**: `{ id, walletId, apiKey }` limpo e debugado

```javascript
_extractSubaccountData(apiResponse) {
  console.log('🔍 EXTRAINDO DADOS DA SUBCONTA:');
  console.log(`   id: ${apiResponse.id}`);
  console.log(`   walletId: ${apiResponse.walletId}`);
  console.log(`   apiKey (root): ${apiResponse.apiKey ? 'presente' : 'ausente'}`);
  console.log(`   accessToken.apiKey: ${apiResponse.accessToken?.apiKey ? 'presente' : 'ausente'}`);
  
  return {
    id: apiResponse.id,
    walletId: apiResponse.walletId,
    apiKey: apiResponse.accessToken?.apiKey || apiResponse.apiKey
  };
}
```

### 2. `_retryGetExistingSubaccount(cpfCnpj)` → Private
**Responsabilidade**: Única função que tenta recuperar 3+ vezes
**Entrada**: CPF/CNPJ
**Saída**: `apiResponse` ou null

Consolida Retry 1, 2, 2b, 2c, 3 em UM lugar só

### 3. `_updateSellerWithSubaccountData(seller, subaccountData, transaction)` → Private
**Responsabilidade**: Salvar dados extraídos no DB
**Entrada**: seller, `{id, walletId, apiKey}`, transaction
**Saída**: seller atualizado

## Benefícios
✅ DRY: Sem repetição de lógica de extração
✅ SOLID: Cada método uma responsabilidade
✅ Legível: Debug claro, fluxo sequencial
✅ Testável: Cada método independente
