# APPNS Assinaturas

## Configuração do Banco de Dados com Docker

Para iniciar o banco de dados MySQL usando Docker:

```bash
# Na raiz do projeto
docker-compose up -d
```

Isso criará um container MySQL com as seguintes configurações:
- Base de dados: appns_assinatura
- Usuário: root
- Senha: (vazia)
- Porta: 3306

## Verificar status do container

```bash
docker ps
```

## Acessar o MySQL no container

```bash
docker exec -it appns_assinatura_db mysql -u root appns_assinatura
```

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