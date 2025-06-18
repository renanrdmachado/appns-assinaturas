const { formatError } = require('../../utils/errorHandler');
const NsApiClient = require('../../helpers/NsApiClient');

/**
 * Endpoint para cálculo de preços de frete para a transportadora integrada à Nuvemshop
 * Este endpoint deve ser acessível publicamente e configurado como callback_url 
 * ao criar uma transportadora na API da Nuvemshop
 */
const calculateShippingRates = async (req, res) => {
    console.log('Controller - ShippingCarrier/calculateShippingRates');
    try {
        const requestData = req.body;
        console.log('Dados recebidos para cálculo de frete:', JSON.stringify(requestData, null, 2));
        
        // Validar dados recebidos
        if (!requestData.store_id || !requestData.destination || !requestData.items) {
            return res.status(422).json({
                code: 422,
                message: 'Unprocessable Entity',
                description: 'Dados insuficientes para cálculo de frete'
            });
        }
        
        // Extrair informações relevantes para cálculo
        const { store_id, currency, destination, items, carrier } = requestData;
        
        // Cálculo de valores e prazos de entrega (exemplo simplificado)
        // Na implementação real, você incluiria sua lógica de cálculo de frete
        // com base na origem, destino, itens, dimensões, etc.
        
        // Calcular peso total
        const totalWeight = items.reduce((sum, item) => sum + (item.grams * item.quantity), 0);
        
        // Preços base para cálculo
        const basePriceStandard = 10.00;
        const basePriceExpress = 20.00;
        
        // Adiciona R$ 1,00 para cada 500g de peso
        const weightFactor = Math.ceil(totalWeight / 500) * 1.00;
        
        // Cálculo de datas de entrega
        const today = new Date();
        
        // Entrega padrão: 3-5 dias úteis
        const minStandardDate = new Date(today);
        minStandardDate.setDate(today.getDate() + 3);
        
        const maxStandardDate = new Date(today);
        maxStandardDate.setDate(today.getDate() + 5);
        
        // Entrega expressa: 1-2 dias úteis
        const minExpressDate = new Date(today);
        minExpressDate.setDate(today.getDate() + 1);
        
        const maxExpressDate = new Date(today);
        maxExpressDate.setDate(today.getDate() + 2);
        
        // Verificar se existem itens com frete grátis
        const hasFreeShippingItems = items.some(item => item.free_shipping);
        
        // Calcular preço para o comerciante (diferente apenas se houver itens com frete grátis)
        const calculateMerchantPrice = (price) => {
            if (!hasFreeShippingItems) {
                return price;
            }
            
            // Cálculo simplificado: se houver itens com frete grátis,
            // o lojista paga parte do frete proporcional aos itens gratuitos
            const freeShippingItemsWeight = items
                .filter(item => item.free_shipping)
                .reduce((sum, item) => sum + (item.grams * item.quantity), 0);
                
            const freeShippingRatio = freeShippingItemsWeight / totalWeight;
            return price * (1 - freeShippingRatio);
        };
        
        // Montar resposta com as opções de frete
        const standardPrice = basePriceStandard + weightFactor;
        const expressPrice = basePriceExpress + weightFactor;
        
        const rates = [
            {
                name: 'Entrega Padrão',
                code: 'standard',
                price: standardPrice,
                price_merchant: calculateMerchantPrice(standardPrice),
                currency: currency || 'BRL',
                type: 'ship',
                min_delivery_date: minStandardDate.toISOString(),
                max_delivery_date: maxStandardDate.toISOString(),
                phone_required: false,
                reference: `frete-padrao-${store_id}`
            },
            {
                name: 'Entrega Expressa',
                code: 'express',
                price: expressPrice,
                price_merchant: calculateMerchantPrice(expressPrice),
                currency: currency || 'BRL',
                type: 'ship',
                min_delivery_date: minExpressDate.toISOString(),
                max_delivery_date: maxExpressDate.toISOString(),
                phone_required: false,
                reference: `frete-expresso-${store_id}`
            }
        ];
        
        // Se a loja estiver em São Paulo, adicionar opção de retirada
        if (destination.province === 'São Paulo' && destination.city === 'São Paulo') {
            rates.push({
                name: 'Retirar na loja - São Paulo',
                code: 'pickup_1',
                price: 0.00,
                price_merchant: 0.00,
                currency: currency || 'BRL',
                type: 'pickup',
                min_delivery_date: minStandardDate.toISOString(),
                max_delivery_date: minStandardDate.toISOString(), // Mesmo dia para retirada
                phone_required: true,
                address: {
                    address: 'Av. Paulista',
                    number: '1000',
                    floor: 'Térreo',
                    locality: 'Bela Vista',
                    city: 'São Paulo',
                    province: 'São Paulo',
                    country: 'BR',
                    phone: '+55 11 3333-4444',
                    zipcode: '01310-100',
                    latitude: '-23.5673",',
                    longitude: '-46.6494'
                },
                hours: [
                    { day: 1, start: '0900', end: '1800' },
                    { day: 2, start: '0900', end: '1800' },
                    { day: 3, start: '0900', end: '1800' },
                    { day: 4, start: '0900', end: '1800' },
                    { day: 5, start: '0900', end: '1800' }
                ]
            });
        }
        
        console.log('Opções de frete calculadas:', JSON.stringify(rates, null, 2));
        
        return res.status(200).json({ rates });
    } catch (error) {
        console.error('Erro ao calcular preços de frete:', error);
        return res.status(500).json(formatError(error));
    }
};

/**
 * Listar todas as transportadoras disponíveis para a loja
 */
const getShippingCarriers = async (req, res) => {
    console.log('Controller - ShippingCarrier/getShippingCarriers');
    try {
        const { seller_id } = req.params;
        const { accessToken } = req.headers;

        if (!seller_id) {
            return res.status(400).json({
                success: false,
                message: 'ID do vendedor (seller_id) é obrigatório'
            });
        }

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso é obrigatório'
            });
        }

        // Obter o storeId associado ao seller_id (implementar lógica conforme necessário)
        const storeId = seller_id; // Neste exemplo, assumimos que seller_id é o mesmo que storeId

        const carriers = await NsApiClient.getShippingCarriers({
            storeId,
            accessToken
        });

        return res.status(200).json({
            success: true,
            data: carriers
        });
    } catch (error) {
        console.error('Erro ao listar transportadoras:', error);
        return res.status(error.status || 500).json(formatError(error));
    }
};

/**
 * Obter detalhes de uma transportadora específica
 */
const getShippingCarrier = async (req, res) => {
    console.log('Controller - ShippingCarrier/getShippingCarrier');
    try {
        const { seller_id, carrier_id } = req.params;
        const { accessToken } = req.headers;

        if (!seller_id || !carrier_id) {
            return res.status(400).json({
                success: false,
                message: 'ID do vendedor e ID da transportadora são obrigatórios'
            });
        }

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso é obrigatório'
            });
        }

        // Obter o storeId associado ao seller_id (implementar lógica conforme necessário)
        const storeId = seller_id; // Neste exemplo, assumimos que seller_id é o mesmo que storeId

        const carrier = await NsApiClient.getShippingCarrier({
            storeId,
            accessToken,
            carrierId: carrier_id
        });

        return res.status(200).json({
            success: true,
            data: carrier
        });
    } catch (error) {
        console.error('Erro ao obter transportadora:', error);
        return res.status(error.status || 500).json(formatError(error));
    }
};

/**
 * Listar opções de uma transportadora
 */
const getShippingCarrierOptions = async (req, res) => {
    console.log('Controller - ShippingCarrier/getShippingCarrierOptions');
    try {
        const { seller_id, carrier_id } = req.params;
        const { accessToken } = req.headers;

        if (!seller_id || !carrier_id) {
            return res.status(400).json({
                success: false,
                message: 'ID do vendedor e ID da transportadora são obrigatórios'
            });
        }

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso é obrigatório'
            });
        }

        // Obter o storeId associado ao seller_id (implementar lógica conforme necessário)
        const storeId = seller_id; // Neste exemplo, assumimos que seller_id é o mesmo que storeId

        const options = await NsApiClient.getShippingCarrierOptions({
            storeId,
            accessToken,
            carrierId: carrier_id
        });

        return res.status(200).json({
            success: true,
            data: options
        });
    } catch (error) {
        console.error('Erro ao listar opções da transportadora:', error);
        return res.status(error.status || 500).json(formatError(error));
    }
};

/**
 * Obter detalhes de uma opção específica
 */
const getShippingCarrierOption = async (req, res) => {
    console.log('Controller - ShippingCarrier/getShippingCarrierOption');
    try {
        const { seller_id, carrier_id, option_id } = req.params;
        const { accessToken } = req.headers;

        if (!seller_id || !carrier_id || !option_id) {
            return res.status(400).json({
                success: false,
                message: 'ID do vendedor, ID da transportadora e ID da opção são obrigatórios'
            });
        }

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso é obrigatório'
            });
        }

        // Obter o storeId associado ao seller_id (implementar lógica conforme necessário)
        const storeId = seller_id; // Neste exemplo, assumimos que seller_id é o mesmo que storeId

        const option = await NsApiClient.getShippingCarrierOption({
            storeId,
            accessToken,
            carrierId: carrier_id,
            optionId: option_id
        });

        return res.status(200).json({
            success: true,
            data: option
        });
    } catch (error) {
        console.error('Erro ao obter opção da transportadora:', error);
        return res.status(error.status || 500).json(formatError(error));
    }
};

/**
 * Listar eventos de entrega de um pedido
 */
const getFulfillmentEvents = async (req, res) => {
    console.log('Controller - ShippingCarrier/getFulfillmentEvents');
    try {
        const { seller_id, order_id } = req.params;
        const { accessToken } = req.headers;

        if (!seller_id || !order_id) {
            return res.status(400).json({
                success: false,
                message: 'ID do vendedor e ID do pedido são obrigatórios'
            });
        }

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso é obrigatório'
            });
        }

        // Obter o storeId associado ao seller_id (implementar lógica conforme necessário)
        const storeId = seller_id; // Neste exemplo, assumimos que seller_id é o mesmo que storeId

        const events = await NsApiClient.getFulfillmentEvents({
            storeId,
            accessToken,
            orderId: order_id
        });

        return res.status(200).json({
            success: true,
            data: events
        });
    } catch (error) {
        console.error('Erro ao listar eventos de entrega:', error);
        return res.status(error.status || 500).json(formatError(error));
    }
};

/**
 * Obter detalhes de um evento de entrega
 */
const getFulfillmentEvent = async (req, res) => {
    console.log('Controller - ShippingCarrier/getFulfillmentEvent');
    try {
        const { seller_id, order_id, event_id } = req.params;
        const { accessToken } = req.headers;

        if (!seller_id || !order_id || !event_id) {
            return res.status(400).json({
                success: false,
                message: 'ID do vendedor, ID do pedido e ID do evento são obrigatórios'
            });
        }

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso é obrigatório'
            });
        }

        // Obter o storeId associado ao seller_id (implementar lógica conforme necessário)
        const storeId = seller_id; // Neste exemplo, assumimos que seller_id é o mesmo que storeId

        const event = await NsApiClient.getFulfillmentEvent({
            storeId,
            accessToken,
            orderId: order_id,
            fulfillmentId: event_id
        });

        return res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        console.error('Erro ao obter evento de entrega:', error);
        return res.status(error.status || 500).json(formatError(error));
    }
};

module.exports = {
    calculateShippingRates,
    getShippingCarriers,
    getShippingCarrier,
    getShippingCarrierOptions,
    getShippingCarrierOption,
    getFulfillmentEvents,
    getFulfillmentEvent
};
