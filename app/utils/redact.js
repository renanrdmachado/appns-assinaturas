// Utilitário reutilizável para mascarar dados sensíveis em logs
// Focado em dados de pagamento e identificação pessoal

function maskMiddle(value, visibleStart = 3, visibleEnd = 2, mask = '*') {
    if (!value && value !== 0) return value;
    const s = String(value);
    if (s.length <= visibleStart + visibleEnd) return mask.repeat(Math.max(0, s.length));
    return s.slice(0, visibleStart) + mask.repeat(s.length - (visibleStart + visibleEnd)) + s.slice(-visibleEnd);
}

function maskCardNumber(number) {
    const s = String(number || '');
    if (s.length < 8) return maskMiddle(s, 0, 0);
    return `${s.slice(0, 4)}${'*'.repeat(Math.max(0, s.length - 8))}${s.slice(-4)}`;
}

function redactSensitive(input) {
    if (input === null || input === undefined) return input;
    if (typeof input !== 'object') return input;

    const clone = JSON.parse(JSON.stringify(input));

    const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;

        // Máscaras por chaves comuns
        if (obj.creditCard && typeof obj.creditCard === 'object') {
            if (obj.creditCard.number) obj.creditCard.number = maskCardNumber(obj.creditCard.number);
            if (obj.creditCard.ccv) obj.creditCard.ccv = '***';
        }
        if (obj.creditCardToken) obj.creditCardToken = '***TOKEN***';
        if (obj.remoteIp) obj.remoteIp = '***.***.***.***';

        // CPF/CNPJ em vários níveis
        if (obj.cpfCnpj) obj.cpfCnpj = maskMiddle(String(obj.cpfCnpj), 3, 2);
        if (obj.creditCardHolderInfo && obj.creditCardHolderInfo.cpfCnpj) {
            obj.creditCardHolderInfo.cpfCnpj = maskMiddle(String(obj.creditCardHolderInfo.cpfCnpj), 3, 2);
        }

        // Percorrer recursivamente objetos/arrays aninhados
        Object.keys(obj).forEach((key) => {
            const val = obj[key];
            if (val && typeof val === 'object') walk(val);
        });
    };

    walk(clone);
    return clone;
}

module.exports = {
    redactSensitive,
    maskCardNumber,
    maskMiddle,
};
