/**
 * Utilitário para mapear entidades para o formato do Asaas
 */
class AsaasMapper {
    /**
     * Mapeia dados de um Shopper para o formato do Customer do Asaas
     * @param {Object} shopper - Objeto Shopper com suas relações (user e userData)
     * @param {string} groupName - Nome do grupo no Asaas
     * @returns {Object} - Dados no formato esperado pelo Asaas
     */
    static mapShopperToCustomer(shopper, groupName) {
        if (!shopper) {
            throw new Error('Shopper não fornecido para mapeamento');
        }

        // Verificar se temos acesso aos dados do usuário e userData
        const userData = shopper.user?.userData;
        if (!userData || !userData.cpf_cnpj) {
            throw new Error('CPF/CNPJ é obrigatório para o mapeamento');
        }

        return {
            name: shopper.name || `Cliente ${shopper.nuvemshop_id || ''}`.trim(),
            cpfCnpj: userData.cpf_cnpj,
            email: shopper.email || shopper.user?.email,
            mobilePhone: userData.mobile_phone,
            address: userData.address,
            addressNumber: userData.address_number,
            province: userData.province,
            postalCode: userData.postal_code,
            externalReference: shopper.nuvemshop_id ? shopper.nuvemshop_id.toString() : undefined,
            groupName: groupName,
            observations: `Cliente da Nuvemshop${shopper.nuvemshop_id ? ' ID: ' + shopper.nuvemshop_id : ''}`,
            notificationDisabled: false
        };
    }

    /**
     * Mapeia dados de um Seller para o formato do Customer do Asaas
     * @param {Object} seller - Objeto Seller com suas relações (user e userData)
     * @param {string} groupName - Nome do grupo no Asaas
     * @returns {Object} - Dados no formato esperado pelo Asaas
     */
    static mapSellerToCustomer(seller, groupName) {
        if (!seller) {
            throw new Error('Seller não fornecido para mapeamento');
        }

        // Verificar se temos acesso aos dados do usuário e userData
        const userData = seller.user?.userData;
        if (!userData || !userData.cpf_cnpj) {
            throw new Error('CPF/CNPJ é obrigatório para o mapeamento');
        }

        // Extrair info da loja do JSON
        const storeInfo = typeof seller.nuvemshop_info === 'string'
            ? JSON.parse(seller.nuvemshop_info)
            : seller.nuvemshop_info || {};

        return {
            name: storeInfo.name || storeInfo.storeName || 'Loja ' + seller.nuvemshop_id,
            cpfCnpj: userData.cpf_cnpj,
            email: seller.user?.email || storeInfo.email,
            mobilePhone: userData.mobile_phone,
            address: userData.address,
            addressNumber: userData.address_number,
            province: userData.province,
            postalCode: userData.postal_code,
            externalReference: seller.nuvemshop_id ? seller.nuvemshop_id.toString() : undefined,
            groupName: groupName,
            observations: `Vendedor da Nuvemshop ID: ${seller.nuvemshop_id}`,
            notificationDisabled: false
        };
    }

    /**
     * Mapeia dados brutos para o formato do Customer do Asaas
     * @param {Object} data - Dados brutos
     * @param {string} type - Tipo de entidade ('seller' ou 'shopper')
     * @param {string} groupName - Nome do grupo no Asaas
     * @returns {Object} - Dados no formato esperado pelo Asaas
     */
    static mapRawDataToCustomer(data, type, groupName) {
        if (!data) {
            throw new Error('Dados não fornecidos para mapeamento');
        }

        if (!data.cpfCnpj) {
            throw new Error('CPF/CNPJ é obrigatório para o mapeamento');
        }

        // Extrair info da loja do JSON para sellers
        let storeInfo = {};
        if (type === 'seller' && data.nuvemshop_info) {
            storeInfo = typeof data.nuvemshop_info === 'string'
                ? JSON.parse(data.nuvemshop_info)
                : data.nuvemshop_info;
        }

        const name = type === 'seller'
            ? (storeInfo.name || storeInfo.storeName || 'Loja ' + data.nuvemshop_id)
            : (data.name || `Cliente ${data.nuvemshop_id || ''}`.trim());

        const observations = type === 'seller'
            ? `Vendedor da Nuvemshop ID: ${data.nuvemshop_id}`
            : `Cliente da Nuvemshop${data.nuvemshop_id ? ' ID: ' + data.nuvemshop_id : ''}`;

        return {
            name: name,
            cpfCnpj: data.cpfCnpj,
            email: data.email || (storeInfo.email || undefined),
            mobilePhone: data.mobilePhone || undefined,
            address: data.address || undefined,
            addressNumber: data.addressNumber || undefined,
            province: data.province || undefined,
            postalCode: data.postalCode || undefined,
            externalReference: data.nuvemshop_id ? data.nuvemshop_id.toString() : undefined,
            groupName: groupName,
            observations: observations,
            notificationDisabled: false
        };
    }
}

module.exports = AsaasMapper;
