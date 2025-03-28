# Checklist de Rotas da API

## Rotas de Produtos
- ✅ GET `/app/products` - Obter todos os produtos
- ✅ GET `/app/products/:id` - Obter produto por ID
- ✅ POST `/app/products` - Criar novo produto
- ✅ PUT `/app/products/:id` - Atualizar produto
- ✅ DELETE `/app/products/:id` - Excluir produto

## Rotas de Pedidos
- ✅ GET `/app/orders` - Obter todos os pedidos
- ✅ GET `/app/orders/:id` - Obter pedido por ID
- ✅ POST `/app/orders` - Criar novo pedido
- ✅ PUT `/app/orders/:id` - Atualizar pedido
- ✅ DELETE `/app/orders/:id` - Excluir pedido

## Rotas de Vendedores
- ✅ GET `/app/sellers` - Obter todos os vendedores
- ✅ GET `/app/sellers/:id` - Obter vendedor por ID
- ✅ POST `/app/sellers` - Criar novo vendedor
- ✅ POST `/app/sellers/:id/subaccount` - Adicionar subconta ao vendedor
- ✅ PUT `/app/sellers/:id` - Atualizar vendedor
- ✅ DELETE `/app/sellers/:id` - Excluir vendedor
- ✅ POST `/app/sellers/:id/sync-asaas` - Sincronizar vendedor com o Asaas
- ✅ GET `/app/sellers/bycpfcnpj/:cpfCnpj` - Buscar vendedor por CPF/CNPJ

## Rotas de Inscrições dos Vendedores
- ✅ GET `/app/seller-subscriptions` - Obter todas as assinaturas dos vendedores
- ✅ GET `/app/seller-subscriptions/:id` - Obter assinatura por ID
- ✅ POST `/app/seller-subscriptions/seller/:seller_id` - Criar nova assinatura para o vendedor
- ✅ GET `/app/seller-subscriptions/seller/:seller_id` - Obter assinaturas do vendedor específico
- ✅ PUT `/app/seller-subscriptions/:id` - Atualizar assinatura
- ✅ DELETE `/app/seller-subscriptions/:id` - Excluir assinatura

## Rotas de Compradores
- ✅ GET `/app/shoppers` - Obter todos os compradores
- ✅ GET `/app/shoppers/:id` - Obter comprador por ID
- ✅ GET `/app/shoppers/external/:nuvemshop_id` - Obter comprador por ID da Nuvemshop
- ✅ POST `/app/shoppers` - Criar novo comprador
- ✅ PUT `/app/shoppers/:id` - Atualizar comprador
- ✅ DELETE `/app/shoppers/:id` - Excluir comprador
- ✅ POST `/app/shoppers/:id/sync-asaas` - Sincronizar comprador com o Asaas
- ✅ GET `/app/shoppers/sync/unsynced` - Listar compradores não sincronizados com o Asaas
- ✅ POST `/app/shoppers/sync/all-unsynced` - Sincronizar todos os compradores não sincronizados com o Asaas
- ✅ GET `/app/shoppers/bycpfcnpj/:cpfCnpj` - Buscar comprador por CPF/CNPJ
- ✅ GET `/app/shoppers/nuvemshop/:nuvemshopId` - Obter comprador por ID da Nuvemshop

## Rotas de Assinaturas dos Compradores
- ✅ GET `/app/shopper-subscriptions` - Obter todas as assinaturas de compradores
- ✅ GET `/app/shopper-subscriptions/:id` - Obter assinatura por ID
- ✅ POST `/app/shopper-subscriptions/order/:order_id` - Criar nova assinatura baseada em pedido
- ✅ GET `/app/shopper-subscriptions/order/:order_id` - Obter assinaturas por pedido
- ✅ GET `/app/shopper-subscriptions/shopper/:shopper_id` - Obter assinaturas por comprador
- ✅ PUT `/app/shopper-subscriptions/:id` - Atualizar assinatura
- ✅ DELETE `/app/shopper-subscriptions/:id` - Excluir assinatura

## Rotas de Subcontas de Vendedores
- ✅ GET `/app/seller-subaccounts` - Listar todas as subcontas de vendedores
- ✅ GET `/app/seller-subaccounts/:seller_id` - Buscar subconta de um vendedor específico
- ✅ POST `/app/seller-subaccounts/:seller_id` - Criar subconta para um vendedor específico

## Rotas de Pagamentos
- ✅ GET `/app/payments` - Obter todos os pagamentos
- ✅ GET `/app/payments/:id` - Obter pagamento por ID
- ✅ PUT `/app/payments/:id` - Atualizar pagamento
- ✅ GET `/app/payments/order/:order_id` - Listar pagamentos por pedido
- ✅ POST `/app/payments/order/:order_id` - Criar pagamento para um pedido
- ✅ GET `/app/payments/subscription/:subscription_id` - Listar pagamentos por assinatura
- ✅ POST `/app/payments/subscription/:subscription_id` - Criar pagamento para uma assinatura

## Rotas de Usuários
- ✅ GET `/app/users` - Obter todos os usuários
- ✅ GET `/app/users/:id` - Obter usuário por ID
- ✅ POST `/app/users` - Criar novo usuário
- ✅ PUT `/app/users/:id` - Atualizar usuário
- ✅ DELETE `/app/users/:id` - Excluir usuário

## Rotas da Nuvemshop
- ✅ GET `/ns/install` - Autorizar instalação do aplicativo na Nuvemshop
- ✅ GET `/ns/seller/:seller_id/products` - Listar produtos da loja na Nuvemshop
- ✅ GET `/ns/seller/:seller_id/products/:product_id` - Obter detalhes de um produto específico
- ✅ POST `/ns/seller/:seller_id/products` - Criar novo produto na Nuvemshop
- ✅ PUT `/ns/seller/:seller_id/products/:product_id` - Atualizar produto na Nuvemshop
- ✅ DELETE `/ns/seller/:seller_id/products/:product_id` - Excluir produto na Nuvemshop
- ✅ GET `/ns/seller/:seller_id/products/:product_id/variants` - Obter variantes de um produto
- ✅ GET `/ns/seller/:seller_id/orders` - Listar pedidos da loja na Nuvemshop
- ✅ GET `/ns/seller/:seller_id/orders/:order_id` - Obter detalhes de um pedido específico
- ✅ POST `/ns/seller/:seller_id/orders` - Criar novo pedido na Nuvemshop
- ✅ PUT `/ns/seller/:seller_id/orders/:order_id` - Atualizar pedido na Nuvemshop
- ✅ POST `/ns/seller/:seller_id/orders/:order_id/close` - Fechar pedido na Nuvemshop
- ✅ POST `/ns/seller/:seller_id/orders/:order_id/open` - Reabrir pedido na Nuvemshop
- ✅ POST `/ns/seller/:seller_id/orders/:order_id/cancel` - Cancelar pedido na Nuvemshop
- ✅ GET `/ns/seller/:seller_id/orders/:order_id/payments` - Obter pagamentos de um pedido
- ✅ GET `/ns/seller/:seller_id/customers` - Listar clientes da loja na Nuvemshop
- ✅ GET `/ns/seller/:seller_id/customers/:customer_id` - Obter detalhes de um cliente específico
- ✅ POST `/ns/seller/:seller_id/customers` - Criar novo cliente na Nuvemshop
- ✅ PUT `/ns/seller/:seller_id/customers/:customer_id` - Atualizar cliente na Nuvemshop
- ✅ GET `/ns/seller/:seller_id/customers/:customer_id/orders` - Obter pedidos de um cliente

## Rotas do Asaas
- ✅ POST `/asaas/customer/:groupName` - Criar ou atualizar cliente no Asaas (SELLERS ou SHOPPERS)
- ✅ GET `/asaas/customer/group/:groupName` - Listar clientes por grupo (SELLERS ou SHOPPERS)
- ✅ GET `/asaas/customer/:groupName/cpfcnpj/:cpfCnpj` - Buscar cliente por CPF/CNPJ em um grupo específico
- ✅ GET `/asaas/customer/:groupName/external/:externalId` - Buscar cliente por referência externa (nuvemshop_id) em um grupo específico
- ✅ DELETE `/asaas/customer/:id` - Remover cliente do Asaas
- ✅ GET `/asaas/customer/:id` - Obter cliente pelo ID no Asaas
- ✅ POST `/asaas/subaccount` - Criar subconta no Asaas
- ✅ GET `/asaas/subaccount` - Obter todas as subcontas
- ✅ GET `/asaas/subaccount/bycpfcnpj/:cpfCnpj` - Obter subconta por CPF/CNPJ
- ✅ POST `/asaas/subscription` - Criar uma assinatura no Asaas
- ✅ GET `/asaas/subscription` - Listar todas as assinaturas no Asaas
- ✅ GET `/asaas/subscription/:id` - Obter assinatura do Asaas pelo ID
- ✅ PUT `/asaas/subscription/:id` - Atualizar assinatura no Asaas
- ✅ DELETE `/asaas/subscription/:id` - Deletar assinatura no Asaas
- ✅ GET `/asaas/subscription/customer/:customer_id` - Listar assinaturas por cliente

## Rotas do Webhook
- ✅ POST `/asaas/webhook/register` - Registrar webhook
- ✅ POST `/asaas/webhook/receive` - Receptor de webhook
- ✅ GET `/asaas/webhook` - Listar webhooks
- ✅ GET `/asaas/webhook/:id` - Obter webhook por ID
- ✅ PUT `/asaas/webhook/:id` - Atualizar webhook
- ✅ DELETE `/asaas/webhook/:id` - Deletar webhook

# Ajustes realizados

## Asaas/Customers
- ✅ "customers" na API do Asaas separados por grupo "SHOPPERS" e "SELLERS"
- ✅ Sincronização automática de Sellers e Shoppers com o Asaas
- ✅ Detecção e reutilização de clientes existentes no Asaas
- ✅ Validação de CPF/CNPJ para Sellers e Shoppers

## Asaas/Subscriptions 
- ✅ Estrutura separada para assinaturas de vendedor (SellerSubscription) e comprador (ShopperSubscription)
- ✅ Criação de assinaturas para vendedores (cobrança do SaaS)
- ✅ Criação de assinaturas para compradores (produtos por assinatura)
- ✅ Formatação correta de datas no formato YYYY-MM-DD para o Asaas
- ✅ Sincronização de status entre banco local e Asaas

## Correções realizadas
- ✅ Correção na formatação de datas para o formato esperado pelo Asaas (YYYY-MM-DD)
- ✅ Correção no tratamento de clientes duplicados no Asaas
- ✅ Melhoria na reutilização de clientes existentes no Asaas
- ✅ Validação e tratamento correto de dados para criação de assinaturas

## Próximos passos
- ⏳ Integração com webhooks para atualização automática de status
- ✅ Integração com Nuvemshop para sincronização de pedidos
- ✅ Cliente API para Nuvemshop implementado
- ✅ Estrutura de controllers segregados por domínio (separação de responsabilidades)
- ✅ Rotas modularizadas por domínio para melhor organização e manutenção
- ⏳ Frontend para gestão das assinaturas