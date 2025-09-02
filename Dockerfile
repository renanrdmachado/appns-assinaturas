# Build simples para produção
FROM node:20-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY app/package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production

# Copiar código da aplicação
COPY app/ .

# Expor porta da aplicação
EXPOSE 3000

# Health check simples
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Comando para iniciar a aplicação
CMD ["node", "index.js"]
