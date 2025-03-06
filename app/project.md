# SELLER
## Instala o APP
> https://mvldev2.lojavirtualnuvem.com.br/admin/apps/15300/authorize

Isso irá retornar o `{code}` que é necessário para gerar o token de acesso

## Gerar Token Nuvemshop
Tipo: API NUVEMSHOP
/POST https://www.nuvemshop.com.br/apps/authorize/token
{
    "client_id": "123",
    "client_secret": "xxxxxxxx",
    "grant_type": "authorization_code",
    "code": {code}
}

## Salvar Token Nuvemshop
Tipo: API NUVEMSHOP
{
  "access_token": "61181d08b7e328d256736hdcb671c3ce50b8af5",
  "token_type": "bearer",
  "scope": "read_orders,write_products",
  "user_id": "789"
}

## Criar user do SELLER no APP
Tipo: API APP
Database: app/users
{
  "id": "789",, AUTOINCREMENT
  "username" : "John Doe", 
  "email": "",
  "password": "",
  "seller_id": "", FOREIGN KEY SELLER
}

## Salva as informações no nosso banco de dados
Tipo: API APP
Database: app/sellers
{
    "id": "123", // AUTOINCREMENT
    "nuvemshop_id": "789", // API NUVEMSHOP
    "nuvemshop_info": "x", // API NUVEMSHOP
    "nuvemshop_api_token": "61181d08b7e328d256736hdcb671c3ce50b8af5", // API NUVEMSHOP
    "payments_customer_id": "123", // API ASAAS CUSTOMER
    "payments_subscription_id": "456", // API ASAAS SUBSCRIPTION
    "payments_next_due": "2022-12-12", // API ASAAS SUBSCRIPTION
    "payments_status": "active", // API ASAAS SUBSCRIPTION
    "subaccount_id": "789", // API ASAAS SUBACCOUNT
    "subaccount_wallet_id": "789", // API ASAAS SUBACCOUNT
    "subaccount_api_key": "789", // API ASAAS SUBACCOUNT
    "app_start_date": "2022-12-12", // DEFINIDO PELO 'APP'
    "app_status": "pending", // DEFINIDO PELO 'APP',
    "Asaas_cpfCnpj": "35381637000150",
    "Asaas_mobilePhone": "41999999999",
    "Asaas_site": "https://www.dominio.com",
    "Asaas_incomeValue": 25000,
    "Asaas_address": "Rua Fernando Orlandi",
    "Asaas_addressNumber": "544",
    "Asaas_province": "Jardim Pedra Branca",
    "Asaas_postalCode": "14079-452",
    "Asaas_loginEmail": "",
    "Asaas_birthDate": "1995-04-12",
}

## Criar assinatura do SELLER no Asaas
Tipo: API ASAAS
/POST https://www.asaas.com.br/api/v3/customers
{
  "name": "John Doe",
  "cpfCnpj": "24971563792",
  "email": "john.doe@asaas.com.br",
  "phone": "4738010919",
  "mobilePhone": "4799376637",
  "postalCode": "01310-000",
  "groupName": "Mensalidade", // "Mensalidade" ou "Assinatura"
  "externalReference": "storeIDdaNuvemshop"
}

Tipo: API ASAAS
/POST https://www.asaas.com.br/api/v3/subscriptions
{
  "customer": "123",
  "billingType": "BOLETO",
  "value": 1000,
  "cycle": "MONTHLY",
  "dueDate": "2022-12-12",
  "description": "Assinatura do Seller"
}

## Criar SubAccount Asaas
Tipo: API ASAAS
/POST https://api-sandbox.asaas.com/v3/accounts
{
  "name": "John Doe",
  "email": "john.doe@asaas.com.br",
  "loginEmail": "johndoe@asaas.com.br",
  "cpfCnpj": "35381637000150",
  "birthDate": "1995-04-12",
  "mobilePhone": "41999999999",
  "site": "https://www.dominio.com",
  "incomeValue": 25000,
  "address": "Rua Fernando Orlandi",
  "addressNumber": "544",
  "province": "Jardim Pedra Branca",
  "postalCode": "14079-452"
}

Isso irá retornar as informações da subconta criada e a `{seller__wallet_id}` que é o ID da conta Asaas para realizar split do pagamento do cliente

## SELLER cria os produtos que deseja vender como assinatura no APP
Tipo: API APP
Database: app/products
/POST app/products
{
  "seller_id": "123",
  "name": "Produto 1",
  "price": 1000,
  "stock": null,
  "sku": "123",
  "description": "Descrição do produto 1",
  "categories": [
    {
      "id": "123"
    }
  ],
  "images": [
    {
      "src": "https://www.dominio.com/imagem.jpg"
    }
  ]
}


## Vincula os produtos criados pelo o SELLER com a Nuvemshop
Tipo: API NUVEMSHOP
/POST https://www.nuvemshop.com.br/api/products
{
  "name": "Produto 1",
  "price": 1000,
  "stock": null,
  "sku": "123",
  "description": "Descrição do produto 1",
  "categories": [
    {
      "id": "123"
    }
  ],
  "images": [
    {
      "src": "https://www.dominio.com/imagem.jpg"
    }
  ]
}

=========== Aqui encerra o processo de criação do SELLER ===========
*/

/*

=========== Aqui começa o processo do CUSTOMER ===========
# CUSTOMER
## Seleciona os produtos que deseja assinar e realiza a compra 
- O cliente seleciona os produtos que deseja assinar
- O cliente realiza a compra dos produtos selecionados
- salvamos as informações no nosso banco de dados
Tipo: API APP
Database: app/orders
/POST app/order
{
  "seller_id": "123",
  "products": [
    {
      "product_id": "123",
      "quantity": 1
    }
  ],
  "customer_id": "123",
  "customer_info": {
    "name": "John Doe",
    "email": "  
  },
  "nuvemshop": {
    "order_id": "123",
    "order_info": "x",
    "order_total": 1000
  },
  "value": 1000,
  "cycle": "MONTHLY",  
}


## Criar cliente do CUSTOMER no Asaas
Tipo: API ASAAS
/POST https://www.asaas.com.br/api/v3/customers
{
  "name": "John Doe",
  "email": ""
}

## Criar assinatura do CUSTOMER no Asaas com o SPLIT do pagamento
/POST https://www.asaas.com.br/api/v3/subscriptions
{
  "customer": "123",
  "billingType": "BOLETO",
  "value": 1000,
  "cycle": "MONTHLY",
  "dueDate": "2022-12-12",
  "description": "seller_id_123",
  "split": [
    {
      "walletId": {app__wallet_id},
      "percentualValue": 3
    },
    {
      "walletId": {seller__wallet_id},
      "percentualValue": 97
    }
  ]
}

## Finaliza no Asaas e salva todas as informações no nosso banco de dados
[atualiza] Database: orders
{
    "id": "123", // AUTOINCREMENT
    "seller_id": "123", // API NUVEMSHOP
    "seller_info": "x", // API NUVEMSHOP
    "seller_api_token": "61181d08b7e328d256736hdcb671c3ce50b8af5", // API NUVEMSHOP
    "payments_customer_id": "123", // API ASAAS CUSTOMER
    "payments_subscription_id": "456", // API ASAAS SUBSCRIPTION
    "payments_next_due": "2022-12-12", // API ASAAS SUBSCRIPTION
    "payments_status": "active", // API ASAAS SUBSCRIPTION
    "subaccount_id": "789", // API ASAAS SUBACCOUNT
    "subaccount_wallet_id": "789", // API ASAAS SUBACCOUNT
    "subaccount_api_key": "789", // API ASAAS SUBACCOUNT
    "app_start_date": "2022-12-12", // DEFINIDO PELO 'APP'
    "app_status": "pending", // DEFINIDO PELO 'APP'
}

=========== Aqui encerra o processo do CUSTOMER ===========

=========== WEBHOOKs ==========

## Webhook de atualização de status de pagamento
Tipo: API ASAAS
/POST https://www.asaas.com.br/api/v3/webhook
{
  "event": "PAYMENT_UPDATED",
  "url": ".../app/webhook"
}
*/

/*

# Arquitetura

## User
  {
    "id": "789", AUTOINCREMENT
    "username" : "John Doe", 
    "email": "",
    "password": "",
    "seller_id": "", FOREIGN KEY SELLER
  }
## Seller
  {
    "id": "123", // AUTOINCREMENT
    "nuvemshop_id": "789", // API NUVEMSHOP
    "nuvemshop_info": "x", // API NUVEMSHOP
    "nuvemshop_api_token": "61181d08b7e328d256736hdcb671c3ce50b8af5", // API NUVEMSHOP
    "payments_customer_id": "123", // API ASAAS CUSTOMER
    "payments_subscription_id": "456", // API ASAAS SUBSCRIPTION
    "payments_next_due": "2022-12-12", // API ASAAS SUBSCRIPTION
    "payments_status": "active", // API ASAAS SUBSCRIPTION
    "subaccount_id": "789", // API ASAAS SUBACCOUNT
    "subaccount_wallet_id": "789", // API ASAAS SUBACCOUNT
    "subaccount_api_key": "789", // API ASAAS SUBACCOUNT
    "app_start_date": "2022-12-12", // DEFINIDO PELO 'APP'
    "app_status": "pending", // DEFINIDO PELO 'APP',
    "Asaas_cpfCnpj": "35381637000150",
    "Asaas_mobilePhone": "41999999999",
    "Asaas_site": "https://www.dominio.com",
    "Asaas_incomeValue": 25000,
    "Asaas_address": "Rua Fernando Orlandi",
    "Asaas_addressNumber": "544",
    "Asaas_province": "Jardim Pedra Branca",
    "Asaas_postalCode": "14079-452",
    "Asaas_loginEmail": "",
    "Asaas_birthDate": "1995-04-12",
  } 
## Orders
  {
    "seller_id": "123",
    "products": [
      {
        "product_id": "123",
        "quantity": 1
      }
    ],
    "customer_id": "123",
    "customer_info": {
      "name": "John Doe",
      "email": "  
    },
    "nuvemshop": {
      "order_id": "123",
      "order_info": "x",
      "order_total": 1000
    },
    "value": 1000,
    "cycle": "MONTHLY",  
  }
## Products
  {
  "seller_id": "123",
  "name": "Produto 1",
  "price": 1000,
  "stock": null,
  "sku": "123",
  "description": "Descrição do produto 1",
  "categories": [
    {
      "id": "123"
    }
  ],
  "images": [
    {
      "src": "https://www.dominio.com/imagem.jpg"
    }
  ]
}