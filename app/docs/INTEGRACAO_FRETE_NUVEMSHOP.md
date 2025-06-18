# Integração de Frete com a API da Nuvemshop

Este documento descreve como utilizar as funções implementadas no `NsApiClient.js` para integração com as APIs de frete da Nuvemshop (Shipping Carrier).

Atualizado em: 16 de junho de 2025

## Visão Geral

Uma transportadora (Shipping Carrier) é um serviço que fornece cálculos de frete em tempo real para as lojas. Usando estas APIs, é possível adicionar uma transportadora a uma loja e fornecer valores de frete no checkout.

## Funções Disponíveis

### Transportadoras (Shipping Carriers)

#### Listar todas as transportadoras
```javascript
const transportadoras = await NsApiClient.getShippingCarriers({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso'
});
```

#### Obter uma transportadora específica
```javascript
const transportadora = await NsApiClient.getShippingCarrier({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  carrierId: '7890'
});
```

#### Criar uma nova transportadora
```javascript
const novaTransportadora = await NsApiClient.createShippingCarrier({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  carrierData: {
    name: "Minha Transportadora",
    callback_url: "https://meu-app.com/api/shipping-rates",
    types: "ship,pickup"
  }
});
```

#### Atualizar uma transportadora existente
```javascript
const transportadoraAtualizada = await NsApiClient.updateShippingCarrier({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  carrierId: '7890',
  carrierData: {
    name: "Nova Transportadora",
    active: false,
    types: "ship"
  }
});
```

#### Remover uma transportadora
```javascript
await NsApiClient.deleteShippingCarrier({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  carrierId: '7890'
});
```

### Opções de Transportadora (Shipping Carrier Options)

#### Listar todas as opções de uma transportadora
```javascript
const opcoes = await NsApiClient.getShippingCarrierOptions({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  carrierId: '7890'
});
```

#### Obter uma opção específica
```javascript
const opcao = await NsApiClient.getShippingCarrierOption({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  carrierId: '7890',
  optionId: '1234'
});
```

#### Criar uma nova opção de transportadora
```javascript
const novaOpcao = await NsApiClient.createShippingCarrierOption({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  carrierId: '7890',
  optionData: {
    code: "pac",
    name: "Correios - PAC"
  }
});
```

#### Atualizar uma opção existente
```javascript
const opcaoAtualizada = await NsApiClient.updateShippingCarrierOption({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  carrierId: '7890',
  optionId: '1234',
  optionData: {
    additional_days: 2,
    additional_cost: 10.0,
    allow_free_shipping: true
  }
});
```

#### Remover uma opção de transportadora
```javascript
await NsApiClient.deleteShippingCarrierOption({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  carrierId: '7890',
  optionId: '1234'
});
```

### Eventos de Entrega (Fulfillment Events)

#### Criar um novo evento de entrega
```javascript
const novoEvento = await NsApiClient.createFulfillmentEvent({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  orderId: '9876',
  fulfillmentData: {
    status: "dispatched",
    description: "Objeto postado",
    city: "São Paulo",
    province: "São Paulo",
    country: "BR",
    happened_at: "2025-06-16T10:30:00-03:00",
    estimated_delivery_at: "2025-06-18T12:00:00-03:00"
  }
});
```

#### Listar todos os eventos de entrega de um pedido
```javascript
const eventos = await NsApiClient.getFulfillmentEvents({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  orderId: '9876'
});
```

#### Obter um evento de entrega específico
```javascript
const evento = await NsApiClient.getFulfillmentEvent({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  orderId: '9876',
  fulfillmentId: '5432'
});
```

#### Remover um evento de entrega
```javascript
await NsApiClient.deleteFulfillmentEvent({
  storeId: '123456',
  accessToken: 'seu_token_de_acesso',
  orderId: '9876',
  fulfillmentId: '5432'
});
```

## Implementação do Endpoint de Callback

Para que a integração funcione corretamente, você precisa implementar um endpoint em seu servidor que será chamado pela Nuvemshop para obter os valores de frete. Este endpoint deve responder com um JSON contendo as opções de frete disponíveis.

### Exemplo de Requisição da Nuvemshop

```json
{
    "store_id": 123456,
    "currency": "BRL",
    "language": "pt-BR",
    "origin": {
        "name": null,
        "location_id": "01GQ85S6PRCSS6ZHQBX9B1HBPW",
        "address": "Avenida Cabildo",
        "number": "4781",
        "floor": null,
        "locality": "Nuñez",
        "city": "Capital Federal",
        "province": "Capital Federal",
        "country": "BR",
        "postal_code": "04001-000",
        "phone": null
    },
    "destination": {
        "name": null,
        "address": "Rua Vergueiro",
        "number": "3000",
        "floor": null,
        "locality": "Vila Mariana",
        "city": "São Paulo",
        "province": "São Paulo",
        "country": "BR",
        "postal_code": "04101-300",
        "phone": null
    },
    "items": [
        {
            "id": 1,
            "product_id": 1,
            "name": "Produto Exemplo",
            "sku": "SKU123",
            "quantity": 2,
            "free_shipping": false,
            "grams": 500,
            "price": 89.90,
            "dimensions": {
                "width": 12.0,
                "height": 10.0,
                "depth": 10.0
            }
        }
    ],
    "carrier": {
        "id": "1234567",
        "name": "Minha Transportadora",
        "options": [
            {
                "id": "14349849",
                "name": "Entrega padrão",
                "code": "standard",
                "allow_free_shipping": false,
                "additional_cost": {
                    "amount": 5.00,
                    "currency": "BRL"
                },
                "additional_days": 1
            },
            {
                "id": "14349850",
                "name": "Entrega expressa",
                "code": "express",
                "allow_free_shipping": false,
                "additional_cost": {
                    "amount": 15.00,
                    "currency": "BRL"
                },
                "additional_days": 0
            }
        ]
    }
}
```

### Exemplo de Resposta

```json
{
    "rates": [
        {
            "name": "Entrega Padrão",
            "code": "standard",
            "price": 12.50,
            "price_merchant": 12.50,
            "currency": "BRL",
            "type": "ship",
            "min_delivery_date": "2025-06-18T00:00:00-03:00",
            "max_delivery_date": "2025-06-20T00:00:00-03:00",
            "phone_required": false,
            "reference": "pedido-123"
        },
        {
            "name": "Entrega Expressa",
            "code": "express",
            "price": 25.00,
            "price_merchant": 25.00,
            "currency": "BRL",
            "type": "ship",
            "min_delivery_date": "2025-06-17T00:00:00-03:00",
            "max_delivery_date": "2025-06-18T00:00:00-03:00",
            "id_required": false,
            "reference": "pedido-123-express"
        }
    ]
}
```

## Notas Importantes

1. **Cache de Requisições**: A Nuvemshop implementa um sistema de cache para reduzir o número de requisições enviadas aos seus endpoints. Qualquer requisição de frete que corresponda exatamente aos mesmos parâmetros (ids de variantes, quantidades, peso da caixa de envio, id da transportadora, origem, destino, pesos e dimensões dos itens) será recuperada do cache da resposta inicial.

2. **TTL do Cache**:
   - Respostas de sucesso (código 200): expiram após 15 minutos.
   - Respostas de erro (código 422): expiram após 1 minuto.
   - Outras respostas não são armazenadas em cache.

3. **Circuit Breaker para Transportadoras Instáveis**: Se seu endpoint de callback experimentar erros frequentes ou altos tempos de resposta, a Nuvemshop implementa um circuit breaker para reduzir o número de requisições enviadas, ajudando a prevenir sobrecarga da API.

## Status Válidos para Eventos de Entrega

- `dispatched`: Pacote foi postado pelo lojista
- `received_by_post_office`: Pacote foi recebido pela transportadora
- `in_transit`: Pacote está em trânsito
- `out_for_delivery`: Pacote saiu para entrega
- `delivery_attempt_failed`: Pacote não pôde ser entregue
- `delayed`: Pacote atrasado
- `ready_for_pickup`: Pacote pronto para retirada
- `delivered`: Pacote foi entregue
- `returned_to_sender`: Pacote foi devolvido ao remetente
- `lost`: Pacote perdido
- `failure`: Falha na entrega do pacote
