const { formatError } = require('../../utils/errorHandler');

class NsEventsController {
    /**
     * Endpoint genérico para receber webhooks de eventos da Nuvemshop
     * Aceita múltiplos eventos (order/paid, order/created, app/uninstalled, etc.)
     */
    async receive(req, res) {
        try {
            const { store_id, event } = req.body || {};

            // Log leve (sem dados sensíveis)
            console.log('NS Webhook recebido', {
                store_id,
                event,
                timestamp: new Date().toISOString()
            });

            // Futuro: roteamento por categoria/evento
            // switch (event) { ... }

            // A Nuvemshop espera 2xx para parar os retries
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Erro ao processar webhook NS:', error.message);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new NsEventsController();
