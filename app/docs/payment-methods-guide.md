# Guia de Gerenciamento de Métodos de Pagamento do Seller

Este guia descreve como usar as APIs para gerenciar os métodos de pagamento aceitos por um seller (lojista).

## Métodos de Pagamento Disponíveis

Os seguintes métodos de pagamento são suportados pelo sistema:

- `credit_card` - Cartão de crédito
- `pix` - Pagamento via PIX
- `boleto` - Boleto bancário

## Endpoints Disponíveis

### Atualizar todos os métodos de pagamento

**Endpoint:** `PATCH /sellers/:id/payment-methods`

**Descrição:** Substitui a lista completa de métodos de pagamento aceitos pelo seller

**Parâmetros da URL:**
- `id` (obrigatório): ID do seller

**Corpo da requisição:**
```json
{
  "payment_methods": ["credit_card", "pix", "boleto"]
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Métodos de pagamento atualizados com sucesso",
  "data": {
    "id": 1,
    "nuvemshop_id": "12345",
    "accepted_payment_methods": ["credit_card", "pix", "boleto"],
    // outros campos do seller...
  }
}
```

### Adicionar um método de pagamento

**Endpoint:** `POST /sellers/:id/payment-methods`

**Descrição:** Adiciona um método de pagamento à lista de métodos aceitos pelo seller

**Parâmetros da URL:**
- `id` (obrigatório): ID do seller

**Corpo da requisição:**
```json
{
  "payment_method": "pix"
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Método de pagamento 'pix' adicionado com sucesso",
  "data": {
    "id": 1,
    "nuvemshop_id": "12345",
    "accepted_payment_methods": ["credit_card", "pix", "boleto"],
    // outros campos do seller...
  }
}
```

### Remover um método de pagamento

**Endpoint:** `DELETE /sellers/:id/payment-methods`

**Descrição:** Remove um método de pagamento da lista de métodos aceitos pelo seller

**Parâmetros da URL:**
- `id` (obrigatório): ID do seller

**Corpo da requisição:**
```json
{
  "payment_method": "boleto"
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Método de pagamento 'boleto' removido com sucesso",
  "data": {
    "id": 1,
    "nuvemshop_id": "12345",
    "accepted_payment_methods": ["credit_card", "pix"],
    // outros campos do seller...
  }
}
```

## Validações

- Pelo menos um método de pagamento deve ser aceito pelo seller
- Não é possível remover o último método de pagamento
- Os métodos de pagamento devem ser válidos (`credit_card`, `pix`, `boleto`)
- Não são permitidos métodos de pagamento duplicados na mesma lista

## Uso no Frontend

### Exemplo de atualização dos métodos de pagamento

```javascript
// Exemplo de como atualizar os métodos de pagamento no frontend
const sellerId = 1;
const paymentMethods = ['credit_card', 'pix']; // Aceitar apenas cartão e pix

axios.patch(`/sellers/${sellerId}/payment-methods`, {
  payment_methods: paymentMethods
})
  .then(response => {
    console.log('Métodos atualizados:', response.data);
  })
  .catch(error => {
    console.error('Erro ao atualizar métodos:', error);
  });
```

### Exemplo de adição de um método de pagamento

```javascript
// Exemplo de como adicionar um método de pagamento
const sellerId = 1;
const paymentMethod = 'boleto';

axios.post(`/sellers/${sellerId}/payment-methods`, {
  payment_method: paymentMethod
})
  .then(response => {
    console.log('Método adicionado:', response.data);
  })
  .catch(error => {
    console.error('Erro ao adicionar método:', error);
  });
```

### Exemplo de remoção de um método de pagamento

```javascript
// Exemplo de como remover um método de pagamento
const sellerId = 1;
const paymentMethod = 'boleto';

axios.delete(`/sellers/${sellerId}/payment-methods`, {
  data: { payment_method: paymentMethod }
})
  .then(response => {
    console.log('Método removido:', response.data);
  })
  .catch(error => {
    console.error('Erro ao remover método:', error);
  });
```

## Notas Importantes

1. Sempre verifique os métodos de pagamento de um seller antes de processar um pagamento.
2. Uso do método `isPaymentMethodAccepted` do modelo Seller é recomendado para verificar se um método é aceito.
3. Os métodos de pagamento aceitos são armazenados no campo `accepted_payment_methods` do modelo Seller.
