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
- ✅ GET `/app/sellers/:id/subscriptions` - Obter assinaturas do vendedor
- ✅ POST `/app/sellers/:id/subscriptions` - Adicionar assinatura ao vendedor
- ✅ POST `/app/sellers/:id/subaccount` - Adicionar subconta ao vendedor
- ✅ PUT `/app/sellers/:id` - Atualizar vendedor
- ✅ DELETE `/app/sellers/:id` - Excluir vendedor

## Rotas de Usuários
- ✅ GET `/app/users` - Obter todos os usuários
- ✅ GET `/app/users/:id` - Obter usuário por ID
- ✅ POST `/app/users` - Criar novo usuário
- ✅ PUT `/app/users/:id` - Atualizar usuário
- ✅ DELETE `/app/users/:id` - Excluir usuário

## Rotas de Pagamentos
- ✅ GET `/app/payments` - Obter todos os pagamentos
- ✅ GET `/app/payments/:id` - Obter pagamento por ID
- ✅ GET `/app/payments/asaas/:asaasId` - Obter pagamento por ID do Asaas
- ✅ POST `/app/payments/sync` - Sincronizar pagamento do Asaas
- ✅ PUT `/app/payments/:id` - Atualizar pagamento

## Rotas da Nuvemshop
- ✅ GET `/ns/install` - Autorizar instalação do aplicativo na Nuvemshop

## Rotas do Asaas
- ✅ POST `/asaas/customer` - Criar novo cliente no Asaas
- ✅ PUT `/asaas/customer/:id` - Atualizar cliente no Asaas
- ❗ POST `/asaas/subaccount` - Criar subconta no Asaas
  > **Observação**: Esta rota possui uma limitação da API do Asaas - ela aceita apenas CNPJ e não CPF para criar subcontas. Além disso, se você enviar uma solicitação com um CPF/CNPJ que já existe, a API silenciosamente retorna a conta existente sem qualquer aviso de que não está criando uma nova conta.
- ✅ GET `/asaas/subaccount` - Obter todas as subcontas
- ✅ GET `/asaas/subaccount/bycpfcnpj/:cpfCnpj` - Obter subconta por CPF/CNPJ
- ✅ GET `/asaas/customers` - Obter clientes com filtros opcionais
- ✅ POST `/asaas/shoppers/subscription` - Criar uma assinatura para os shoppers

## Rotas do Webhook
- ✅ POST `/asaas/webhook/register` - Registrar webhook
- ✅ POST `/asaas/webhook/receive` - Receptor de webhook
- ✅ GET `/asaas/webhook` - Listar webhooks
- ✅ PUT `/asaas/webhook/:id` - Atualizar webhook
- ✅ DELETE `/asaas/webhook/:id` - Deletar webhook


# Ajustes da API

## Shoppers
- ⏳ user_id_ns
- ⏳ seller_id_ns
- ⏳ cus_id_asaas
- ⏳ token_credit_card
- ⏳ email

## Asaas/Customers
- ✅ "customers" na api do asaas separados por grupo "shoppers" e "sellers"
- ✅ PUT `/asaas/customers/:id` -  Atualizar cliente no Asaas
- ✅ POST `/asaas/shoppers/subscription` - Criar uma assinatura para os shoppers

## Payments CRUD
- ✅ payments_sellers
- ✅ payments_shoppers

## Nuvemshop
- ⏳ vincular webhook do asaas para criar uma order no ns toda vez que se criar um novo pagamento

## Outros
- ✅ Refatorar a estrutura do projeto para melhor organização e escalabilidade