# APPNS Assinaturas

## Pré-requisitos

Antes de começar, você precisa ter instalado em sua máquina:

- [Docker](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/) (versão 14 ou superior)
- [NPM](https://www.npmjs.com/) (geralmente vem com Node.js)

## Configuração do Banco de Dados com Docker

Para iniciar o banco de dados MySQL usando Docker:

```bash
# Na raiz do projeto
docker compose up -d
```

Isso criará um container MySQL com as seguintes configurações:
- Base de dados: appns_assinatura
- Usuário: root
- Senha: (vazia)
- Porta: 3306

## PHPMyAdmin

Você pode acessar o PHPMyAdmin para gerenciar o banco de dados através da URL:

```
http://localhost:8080
```

Dados de acesso:
- Servidor: mysql
- Usuário: root
- Senha: (vazia/em branco)

## Parar o container

```bash
docker-compose down
```

## Instalação de Dependências

Para instalar as dependências do projeto:

```bash
# Navegue até a pasta app
cd app

# Instale as dependências
npm install
```

## Executando o Projeto

Para executar o projeto em modo de desenvolvimento:

```bash
# Na pasta app
npm run dev
```

O servidor de desenvolvimento será iniciado e o projeto estará disponível em `http://localhost:3000`.