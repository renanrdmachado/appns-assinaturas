require('dotenv').config();
const NsService = require('../../services/ns.service');
const SellerService = require('../../services/seller.service');
const NsProductsService = require('../../services/ns/products.service');
const ProductService = require('../../services/product.service');

const { formatError, createError } = require('../../utils/errorHandler');

class NsProductsController {
    async getProducts(req, res) {
        try {
            const { seller_id } = req.params;
            console.log(`Buscando seller com ID: ${seller_id}`);
            
            // Obter o seller do serviço
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success || !sellerResult.data) {
                return res.status(404).json(createError('Vendedor não encontrado', 404));
            }
            
            const seller = sellerResult.data;
            
            // Log para diagnosticar o valor do seller
            console.log('Seller encontrado:', JSON.stringify({
                id: seller.id,
                nuvemshop_id: seller.nuvemshop_id,
                apiToken: seller.nuvemshop_api_token ? 'exists' : 'missing'
            }, null, 2));
            
            // Verificação corrigida: acessar propriedades diretamente do objeto seller
            if (!seller.nuvemshop_id) {
                console.error(`Erro: nuvemshop_id está ausente para o seller ${seller_id}`);
                return res.status(400).json(createError('ID da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            console.log(`Buscando produtos para a loja Nuvemshop ID: ${seller.nuvemshop_id}`);
            
            if (!seller.nuvemshop_api_token) {
                console.error(`Erro: nuvemshop_api_token está ausente para o seller ${seller_id}`);
                return res.status(400).json(createError('Token de API da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await NsService.getProducts(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token,
                params
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar produtos da Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    async getProductById(req, res) {
        try {
            const { seller_id, product_id } = req.params;
            
            // Obter o seller do serviço
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success || !sellerResult.data) {
                return res.status(404).json(createError('Vendedor não encontrado', 404));
            }
            
            const seller = sellerResult.data;
            
            // Verificação corrigida: acessar propriedades diretamente do objeto seller
            if (!seller.nuvemshop_id) {
                console.error(`Erro: nuvemshop_id está ausente para o seller ${seller_id}`);
                return res.status(400).json(createError('ID da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            if (!seller.nuvemshop_api_token) {
                console.error(`Erro: nuvemshop_api_token está ausente para o seller ${seller_id}`);
                return res.status(400).json(createError('Token de API da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            const result = await NsService.getProductById(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token,
                product_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar produto da Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    async createProduct(req, res) {
        try {
            const { seller_id } = req.params;
            const productData = req.body;
            
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            // Log do seller para debug
            console.log('Seller encontrado:', JSON.stringify(seller.data, null, 2));
            
            // Verificação melhorada para garantir que nuvemshop_id existe e não está vazio
            if (!seller.data.nuvemshop_id || seller.data.nuvemshop_id.toString().trim() === '') {
                console.error('Erro: nuvemshop_id está ausente ou vazio');
                return res.status(400).json(createError('ID da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            // Verificação melhorada para garantir que o token existe
            if (!seller.data.nuvemshop_api_token || seller.data.nuvemshop_api_token.toString().trim() === '') {
                console.error('Erro: nuvemshop_api_token está ausente ou vazio');
                return res.status(400).json(createError('Token de API da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            const result = await NsService.createProduct(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
                productData
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(201).json(result);
        } catch (error) {
            console.error('Erro ao criar produto na Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    async updateProduct(req, res) {
        try {
            const { seller_id, product_id } = req.params;
            const productData = req.body;
            
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            // Log do seller para debug
            console.log('Seller encontrado:', JSON.stringify(seller.data, null, 2));
            
            // Verificação melhorada para garantir que nuvemshop_id existe e não está vazio
            if (!seller.data.nuvemshop_id || seller.data.nuvemshop_id.toString().trim() === '') {
                console.error('Erro: nuvemshop_id está ausente ou vazio');
                return res.status(400).json(createError('ID da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            // Verificação melhorada para garantir que o token existe
            if (!seller.data.nuvemshop_api_token || seller.data.nuvemshop_api_token.toString().trim() === '') {
                console.error('Erro: nuvemshop_api_token está ausente ou vazio');
                return res.status(400).json(createError('Token de API da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            const result = await NsService.updateProduct(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
                product_id,
                productData
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao atualizar produto na Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    async deleteProduct(req, res) {
        try {
            const { seller_id, product_id } = req.params;
            
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            // Log do seller para debug
            console.log('Seller encontrado:', JSON.stringify(seller.data, null, 2));
            
            // Verificação melhorada para garantir que nuvemshop_id existe e não está vazio
            if (!seller.data.nuvemshop_id || seller.data.nuvemshop_id.toString().trim() === '') {
                console.error('Erro: nuvemshop_id está ausente ou vazio');
                return res.status(400).json(createError('ID da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            // Verificação melhorada para garantir que o token existe
            if (!seller.data.nuvemshop_api_token || seller.data.nuvemshop_api_token.toString().trim() === '') {
                console.error('Erro: nuvemshop_api_token está ausente ou vazio');
                return res.status(400).json(createError('Token de API da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            const result = await NsService.deleteProduct(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
                product_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao excluir produto na Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    async getProductVariants(req, res) {
        try {
            const { seller_id, product_id } = req.params;
            
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            // Log do seller para debug
            console.log('Seller encontrado:', JSON.stringify(seller.data, null, 2));
            
            // Verificação melhorada para garantir que nuvemshop_id existe e não está vazio
            if (!seller.data.nuvemshop_id || seller.data.nuvemshop_id.toString().trim() === '') {
                console.error('Erro: nuvemshop_id está ausente ou vazio');
                return res.status(400).json(createError('ID da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            // Verificação melhorada para garantir que o token existe
            if (!seller.data.nuvemshop_api_token || seller.data.nuvemshop_api_token.toString().trim() === '') {
                console.error('Erro: nuvemshop_api_token está ausente ou vazio');
                return res.status(400).json(createError('Token de API da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            const result = await NsService.getProductVariants(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
                product_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar variantes do produto na Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }

    /**
     * Sincroniza um produto local com a Nuvemshop
     */
    async syncProduct(req, res) {
        try {
            const { seller_id, product_id } = req.params;
            
            console.log(`Iniciando sincronização do produto ${product_id} para o seller ${seller_id}`);
            
            // Obter o seller
            const seller = await SellerService.get(seller_id);
            
            if (!seller || !seller.success || !seller.data) {
                return res.status(404).json(createError('Vendedor não encontrado', 404));
            }
            
            const sellerData = seller.data;
            
            // Verificação para garantir que nuvemshop_id existe e não está vazio
            if (!sellerData.nuvemshop_id || sellerData.nuvemshop_id.toString().trim() === '') {
                console.error('Erro: nuvemshop_id está ausente ou vazio');
                return res.status(400).json(createError('ID da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            // Verificação para garantir que o token existe
            if (!sellerData.nuvemshop_api_token || sellerData.nuvemshop_api_token.toString().trim() === '') {
                console.error('Erro: nuvemshop_api_token está ausente ou vazio');
                return res.status(400).json(createError('Token de API da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            // Obter o produto local
            const product = await ProductService.get(product_id);
            
            if (!product || !product.success || !product.data) {
                return res.status(404).json(createError('Produto não encontrado', 404));
            }
            
            const productData = product.data;
            
            // Verificar se o produto pertence a este seller
            if (String(productData.seller_id) !== String(seller_id)) {
                return res.status(403).json(createError('Este produto não pertence a este vendedor', 403));
            }
            
            // Executar a sincronização
            const result = await NsProductsService.syncProduct(
                sellerData.nuvemshop_id,
                sellerData.nuvemshop_api_token,
                productData
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao sincronizar produto com a Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new NsProductsController();
