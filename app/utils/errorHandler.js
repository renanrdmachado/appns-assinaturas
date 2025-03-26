/**
 * Formata erros de forma padronizada para respostas da API
 * @param {Error} error - Objeto de erro
 * @param {string} defaultMessage - Mensagem padrão se não houver mensagem no erro
 * @returns {Object} - Objeto formatado para resposta da API
 */
function formatError(error, defaultMessage = 'Ocorreu um erro durante o processamento') {
    // Se o erro já tiver um formato padronizado, apenas retorná-lo
    if (error.success === false && (error.message || error.error)) {
        return error;
    }
    
    // Verificar se o erro possui um código de status HTTP
    const statusCode = error.statusCode || 
                      (error.response && error.response.status) || 
                      500;
    
    // Verificar se há erros de validação
    const validationErrors = error.validationErrors || 
                           (error.response && error.response.data && error.response.data.errors) ||
                           null;
    
    // Construir a resposta padronizada
    const formattedError = {
        success: false,
        message: error.message || defaultMessage,
        status: statusCode
    };
    
    // Adicionar detalhes de erro quando disponíveis
    if (error.name && error.name !== 'Error') {
        formattedError.error = error.name;
    }
    
    // Adicionar erros de validação quando disponíveis
    if (validationErrors) {
        formattedError.validationErrors = validationErrors;
    }
    
    // Adicionar detalhes do erro de resposta da API
    if (error.response && error.response.data) {
        formattedError.details = error.response.data;
    }
    
    // Adicionar stack trace em desenvolvimento (opcional)
    if (process.env.NODE_ENV === 'development' && error.stack) {
        formattedError.stack = error.stack;
    }
    
    return formattedError;
}

/**
 * Cria um erro formatado diretamente
 * @param {string} message - Mensagem de erro
 * @param {number} status - Código de status HTTP
 * @param {Array|Object} validationErrors - Erros de validação (opcional)
 * @returns {Object} - Objeto formatado para resposta da API
 */
function createError(message, status = 400, validationErrors = null) {
    const error = {
        success: false,
        message: message,
        status: status
    };
    
    if (validationErrors) {
        error.validationErrors = validationErrors;
    }
    
    return error;
}

/**
 * Verifica se o resultado de uma operação foi bem-sucedido
 * @param {Object} result - Resultado da operação
 * @param {Object} res - Objeto de resposta do Express
 * @returns {boolean} - true se foi enviada uma resposta
 */
function handleOperationResult(result, res) {
    if (!result) {
        res.status(500).json(createError('Ocorreu um erro interno no servidor'));
        return true;
    }
    
    if (!result.success) {
        res.status(result.status || 400).json(result);
        return true;
    }
    
    return false;
}

module.exports = {
    formatError,
    createError,
    handleOperationResult
};
