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
    // Se for um erro da Nuvemshop com detalhes específicos
    else if (error.nsError) {
        const status = error.status || error.nsError.status || 400;
        errorResponse.status = status;
        
        // Adicionar detalhes do erro da Nuvemshop
        if (error.nsError.originalError) {
            const nsOriginalError = error.nsError.originalError;
            
            // Tratar erros de validação (422) ou outros erros estruturados
            if (nsOriginalError.code === 422 || status === 422) {
                errorResponse.message = 'Unprocessable Entity';
                
                // Extrair erros de validação diretamente
                const detailsObj = {};
                for (const field in nsOriginalError) {
                    if (Array.isArray(nsOriginalError[field]) && 
                        field !== 'errors' && 
                        field !== 'message' && 
                        field !== 'code' && 
                        field !== 'description') {
                        
                        detailsObj[field] = nsOriginalError[field];
                    }
                }
                
                // Incluir detalhes formatados
                errorResponse.nsDetails = detailsObj;
            } else {
                errorResponse.message = nsOriginalError.description || nsOriginalError.message || error.message;
                errorResponse.nsDetails = nsOriginalError;
            }
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
    // Se tiver status específico
    else if (error.status) {
        errorResponse.status = error.status;
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
 * @param {Array|Object} errors - Lista de erros específicos ou objeto com erros (opcional)
 * @returns {Object} - Objeto de erro formatado
 */
const createError = (message, status = 400, errors = null) => {
    const errorObj = {
        success: false,
        status,
        message
    };
    
    if (errors) {
        if (Array.isArray(errors)) {
            errorObj.errors = errors;
        } else if (typeof errors === 'object') {
            errorObj.errors = Object.entries(errors).map(([field, msg]) => `${field}: ${msg}`);
        } else {
            errorObj.errors = [errors];
        }
    }
    
    return errorObj;
};

module.exports = {
    formatError,
    createError
};
