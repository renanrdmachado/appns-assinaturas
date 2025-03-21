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

## Rotas de Inscrições dos Vendedores
- ✅ GET `app/seller-subscriptions` - Obter todas as assinaturas dos vendedores
- ✅ GET `app/seller-subscriptions/:id` - Obter assinatura por ID
- ✅ POST `app/seller-subscriptions/seller/:seller_id` - Criar nova assinatura para o vendedor
- ✅ GET `app/seller-subscriptions/seller/:seller_id` - Obter assinaturas do vendedor específico
- ✅ PUT `app/seller-subscriptions/:id` - Atualizar assinatura
- ✅ DELETE `app/seller-subscriptions/:id` - Excluir assinatura

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

## Rotas de Usuários
- ✅ GET `/app/users` - Obter todos os usuários
- ✅ GET `/app/users/:id` - Obter usuário por ID
- ✅ POST `/app/users` - Criar novo usuário
- ✅ PUT `/app/users/:id` - Atualizar usuário
- ✅ DELETE `/app/users/:id` - Excluir usuário

## Rotas de Pagamentos
- ✅ GET `/app/payments` - Obter todos os pagamentos
- ✅ GET `/app/payments/:id` - Obter pagamento por ID
- ✅ PUT `/app/payments/:id` - Atualizar pagamento
- ✅ GET `/app/payments/order/:order_id` - Listar pagamentos por pedido
- ✅ POST `/app/payments/order/:order_id` - Criar pagamento para pedido
- ✅ GET `/app/payments/subscription/:subscription_id` - Listar pagamentos por assinatura
- ✅ POST `/app/payments/subscription/:subscription_id` - Criar pagamento para assinatura

## Rotas da Nuvemshop
- ✅ GET `/ns/install` - Autorizar instalação do aplicativo na Nuvemshop

## Rotas do Asaas
- ✅ POST `/asaas/customer/:groupName` - Criar ou atualizar cliente no Asaas (SELLERS ou SHOPPERS)
- ✅ GET `/asaas/customer/group/:groupName` - Listar clientes por grupo (SELLERS ou SHOPPERS)
- ✅ GET `/asaas/customer/:groupName/cpfcnpj/:cpfCnpj` - Buscar cliente por CPF/CNPJ em um grupo específico
- ✅ GET `/asaas/customer/:groupName/external/:externalId` - Buscar cliente por referência externa (nuvemshop_id) em um grupo específico
- ✅ DELETE `/asaas/customer/:id` - Remover cliente do Asaas
- ❗ POST `/asaas/subaccount` - Criar subconta no Asaas
  > **Observação**: Esta rota possui uma limitação da API do Asaas - ela aceita apenas CNPJ e não CPF para criar subcontas. Além disso, se você enviar uma solicitação com um CPF/CNPJ que já existe, a API silenciosamente retorna a conta existente sem qualquer aviso de que não está criando uma nova conta.
- ✅ GET `/asaas/subaccount` - Obter todas as subcontas
- ✅ GET `/asaas/subaccount/bycpfcnpj/:cpfCnpj` - Obter subconta por CPF/CNPJ
- ✅ POST `/asaas/shoppers/subscription` - Criar uma assinatura para os shoppers

## Rotas do Webhook
- ✅ POST `/asaas/webhook/register` - Registrar webhook
- ✅ POST `/asaas/webhook/receive` - Receptor de webhook
- ✅ GET `/asaas/webhook` - Listar webhooks
- ✅ PUT `/asaas/webhook/:id` - Atualizar webhook
- ✅ DELETE `/asaas/webhook/:id` - Deletar webhook

# Ajustes da API

## Asaas/Customers
- ✅ "customers" na api do asaas separados por grupo "SHOPPERS" e "SELLERS"
- ✅ Sincronização automática de Sellers e Shoppers com o Asaas
- ✅ Rotas manuais para sincronização com o Asaas
- ✅ Simplificação da API do Asaas para eliminar métodos redundantes
- ✅ Adicionado suporte para sincronização em massa de shoppers não sincronizados
- ✅ CPF/CNPJ agora é obrigatório para Sellers e Shoppers
- ✅ Melhorias nas validações de clientes para Asaas

## Asaas/Subaccounts (falta implementar)

## Asaas/Subscriptions (falta implementar)

## Nuvemshop (falta implementar)
- ⏳ vincular webhook do asaas para criar uma order no ns toda vez que se criar um novo pagamento
- ⏳ integrar pedidos a api do ns
- ⏳ integrar produtos a api do ns
- ⏳ integrar clientes a api do ns

## Webhook (criar ações para os webhooks)

# Frontend (falta implementar)