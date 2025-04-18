
class AsaasFormatter {
    /**
     * Normaliza o ciclo para o formato esperado pelo Asaas.
     * @param {string} cycle - Ciclo fornecido.
     * @returns {string} - Ciclo normalizado.
     */
    static normalizeCycle(cycle) {
        const validCycles = [
            'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY',
            'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'
        ];
        const upperCycle = cycle ? cycle.toUpperCase() : '';
        return validCycles.includes(upperCycle) ? upperCycle : null;
    }

    /**
     * Verifica se o ciclo fornecido é válido.
     * @param {string} cycle - Ciclo fornecido.
     * @returns {boolean} - True se o ciclo for válido, false caso contrário.
     */
    static isValidCycle(cycle) {
        return !!this.normalizeCycle(cycle);
    }

    /**
     * Formata uma data para o formato esperado pelo Asaas (YYYY-MM-DD).
     * @param {string|Date} date - Data a ser formatada.
     * @returns {string} - Data formatada.
     */
    static formatDate(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        if (isNaN(date.getTime())) {
            throw new Error('Data inválida');
        }
        return date.toISOString().split('T')[0];
    }

    /**
     * Mapeia o status do Asaas para o status local.
     * @param {string} asaasStatus - Status retornado pelo Asaas.
     * @returns {string} - Status mapeado para o sistema local.
     */
    static mapAsaasStatusToLocalStatus(asaasStatus) {
        const statusMap = {
            ACTIVE: 'active',
            INACTIVE: 'inactive',
            OVERDUE: 'overdue',
            CANCELED: 'canceled',
            PENDING: 'pending'
        };
        return statusMap[asaasStatus] || 'pending';
    }
}

module.exports = AsaasFormatter;
