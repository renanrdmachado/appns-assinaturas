require('dotenv').config();
const AsaasCustomerService = require('../../services/asaas/customer.service');

/**
 * Criar ou atualizar cliente no Asaas
 */
const createOrUpdate = async (req, res) => {
    try {
        const { groupName } = req.params;
        const customerData = req.body;
        
        if (!groupName || ![AsaasCustomerService.SELLER_GROUP, AsaasCustomerService.SHOPPER_GROUP].includes(groupName)) {
            return res.status(400).json({
                success: false,
                message: `Grupo inválido. Use ${AsaasCustomerService.SELLER_GROUP} ou ${AsaasCustomerService.SHOPPER_GROUP}`
            });
        }
        
        const result = await AsaasCustomerService.createOrUpdate(customerData, groupName);
        
        if (!result.success) {
            return res.status(result.status || 400).json({
                success: false,
                message: result.message
            });
        }
        
        return res.status(result.isNew ? 201 : 200).json({
            success: true,
            message: result.isNew ? 
                `Cliente criado com sucesso no grupo ${groupName}` : 
                `Cliente atualizado com sucesso no grupo ${groupName}`,
            data: result.data
        });
    } catch (error) {
        console.error('Erro ao criar/atualizar cliente no Asaas:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao processar a solicitação',
            error: error.message
        });
    }
};

/**
 * Listar clientes por grupo
 */
const listByGroup = async (req, res) => {
    try {
        const { groupName } = req.params;
        const filters = req.query; // offset, limit, etc.
        
        if (!groupName || ![AsaasCustomerService.SELLER_GROUP, AsaasCustomerService.SHOPPER_GROUP].includes(groupName)) {
            return res.status(400).json({
                success: false,
                message: `Grupo inválido. Use ${AsaasCustomerService.SELLER_GROUP} ou ${AsaasCustomerService.SHOPPER_GROUP}`
            });
        }
        
        const result = await AsaasCustomerService.listByGroup(groupName, filters);
        
        if (!result.success) {
            return res.status(result.status || 400).json({
                success: false,
                message: result.message
            });
        }
        
        return res.json(result);
    } catch (error) {
        console.error('Erro ao listar clientes por grupo:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Erro ao listar clientes no Asaas',
            error: error.message
        });
    }
};

/**
 * Buscar cliente por CPF/CNPJ
 */
const findByCpfCnpj = async (req, res) => {
    try {
        const { cpfCnpj } = req.params;
        const { groupName } = req.query;
        
        // Verificar se o groupName está presente na query
        if (!groupName) {
            return res.status(400).json({
                success: false,
                message: `O parâmetro 'groupName' é obrigatório. Use '${AsaasCustomerService.SELLER_GROUP}' ou '${AsaasCustomerService.SHOPPER_GROUP}'`
            });
        }
        
        if (![AsaasCustomerService.SELLER_GROUP, AsaasCustomerService.SHOPPER_GROUP].includes(groupName)) {
            return res.status(400).json({
                success: false,
                message: `Grupo inválido. Use '${AsaasCustomerService.SELLER_GROUP}' ou '${AsaasCustomerService.SHOPPER_GROUP}'`
            });
        }
        
        const result = await AsaasCustomerService.findByCpfCnpj(cpfCnpj, groupName);
        
        if (!result.success) {
            return res.status(result.status || 400).json({
                success: false,
                message: result.message
            });
        }
        
        return res.json(result);
    } catch (error) {
        console.error('Erro ao buscar cliente por CPF/CNPJ no Asaas:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar cliente no Asaas',
            error: error.message
        });
    }
};

/**
 * Buscar cliente por referência externa (nuvemshop_id)
 */
const findByExternalReference = async (req, res) => {
    try {
        const { externalId } = req.params;
        const { groupName } = req.query;
        
        // Verificar se o groupName está presente na query
        if (!groupName) {
            return res.status(400).json({
                success: false,
                message: `O parâmetro 'groupName' é obrigatório. Use '${AsaasCustomerService.SELLER_GROUP}' ou '${AsaasCustomerService.SHOPPER_GROUP}'`
            });
        }
        
        if (![AsaasCustomerService.SELLER_GROUP, AsaasCustomerService.SHOPPER_GROUP].includes(groupName)) {
            return res.status(400).json({
                success: false,
                message: `Grupo inválido. Use '${AsaasCustomerService.SELLER_GROUP}' ou '${AsaasCustomerService.SHOPPER_GROUP}'`
            });
        }
        
        const result = await AsaasCustomerService.findByExternalReference(externalId, groupName);
        
        if (!result.success) {
            return res.status(result.status || 400).json({
                success: false,
                message: result.message
            });
        }
        
        return res.json(result);
    } catch (error) {
        console.error('Erro ao buscar cliente por referência externa no Asaas:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar cliente no Asaas',
            error: error.message
        });
    }
};

/**
 * Remover cliente do Asaas
 */
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID do cliente é obrigatório'
            });
        }
        
        const result = await AsaasCustomerService.remove(id);
        
        if (!result.success) {
            return res.status(result.status || 400).json({
                success: false,
                message: result.message
            });
        }
        
        return res.json({
            success: true,
            message: 'Cliente removido com sucesso no Asaas',
            data: result.data
        });
    } catch (error) {
        console.error('Erro ao remover cliente no Asaas:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao remover cliente no Asaas',
            error: error.message
        });
    }
};

module.exports = {
    createOrUpdate,
    listByGroup,
    findByCpfCnpj,
    findByExternalReference,
    remove
};
