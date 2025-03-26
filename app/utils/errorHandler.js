/**
 * Formata um erro para retornar na API
 * @param {Error} error - Objeto de erro
 * @returns {Object} - Erro formatado
 */
const formatError = (error) => {
    // Objeto base de resposta
    const errorResponse = {
        success: false,
        message: error.message || 'Erro interno do servidor'
    };
    
    // Se for um erro do Asaas com detalhes específicos
    if (error.asaasError) {
        errorResponse.status = error.status || 400;
        errorResponse.errors = error.asaasError.errors || [];
        
        // Evita redundância - não incluir originalError se for igual ao errors
        if (error.asaasError.originalError && 
            JSON.stringify(error.asaasError.originalError) !== JSON.stringify({ errors: errorResponse.errors })) {
            errorResponse.asaasDetails = error.asaasError.originalError;
        }
    }
    // Se for um erro de validação com errors
    else if (error.validationErrors) {
        errorResponse.status = error.statusCode || 400;
        errorResponse.errors = error.validationErrors;
    }
    // Se for um erro com statusCode
    else if (error.statusCode) {
        errorResponse.status = error.statusCode;
    }
    // Erro genérico
    else {
        console.error('Erro não tratado:', error);
        errorResponse.status = 500;
    }
    
    return errorResponse;
};

/**
 * Cria um objeto de erro para retornar na API
 * @param {string} message - Mensagem de erro
 * @param {number} status - Status HTTP
 * @param {Array} errors - Lista de erros específicos (opcional)
 * @returns {Object} - Objeto de erro formatado
 */
const createError = (message, status = 400, errors = null) => {
    const errorObj = {
        success: false,
        status,
        message
    };
    
    if (errors) {
        errorObj.errors = Array.isArray(errors) ? errors : [errors];
    }
    
    return errorObj;
};

module.exports = {
    formatError,
    createError
};
