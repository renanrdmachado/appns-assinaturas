/**
 * Testes para SplitCalculatorService
 * 
 * Cobertura completa da lógica de cálculo de split:
 * - Split fixo (valor fixo para sistema, restante para seller)
 * - Split percentual (% para sistema, % para seller)
 * - Validações de seller (wallet obrigatória)
 * - Validações de valor (deve ser > 0 e > taxa fixa)
 * - Edge cases (percentual >= 100, valores negativos, etc)
 */

const SplitCalculatorService = require('../../services/split-calculator.service');

describe('SplitCalculatorService', () => {
    const originalEnv = process.env;
    const validWalletId = '7b3b92a0-4d11-4e22-a3f4-3bd76abc11ff';

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('calculateSplit - Split Fixo', () => {
        beforeEach(() => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '0';
            process.env.AS_SPLIT_SYSTEM_FIXED = '2.00';
        });

        test('calcula split fixo corretamente com valor válido', () => {
            const result = SplitCalculatorService.calculateSplit(25.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split).toEqual([
                {
                    walletId: validWalletId,
                    fixedValue: 23.00
                }
            ]);
        });

        test('bloqueia quando valor é igual à taxa fixa', () => {
            const result = SplitCalculatorService.calculateSplit(2.00, validWalletId);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error.message).toContain('deve ser maior que a taxa do sistema');
            expect(result.error.status).toBe(400);
        });

        test('bloqueia quando valor é menor que taxa fixa', () => {
            const result = SplitCalculatorService.calculateSplit(1.50, validWalletId);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('deve ser maior que a taxa do sistema');
        });

        test('bloqueia quando valor é zero', () => {
            const result = SplitCalculatorService.calculateSplit(0, validWalletId);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('deve ser maior que zero');
        });

        test('bloqueia quando valor é negativo', () => {
            const result = SplitCalculatorService.calculateSplit(-10, validWalletId);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('deve ser maior que zero');
        });

        test('bloqueia quando valor é null', () => {
            const result = SplitCalculatorService.calculateSplit(null, validWalletId);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('deve ser maior que zero');
        });

        test('bloqueia quando valor é undefined', () => {
            const result = SplitCalculatorService.calculateSplit(undefined, validWalletId);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('deve ser maior que zero');
        });

        test('calcula corretamente com taxa fixa customizada', () => {
            process.env.AS_SPLIT_SYSTEM_FIXED = '5.00';
            const result = SplitCalculatorService.calculateSplit(100.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].fixedValue).toBe(95.00);
        });

        test('calcula corretamente com valores decimais', () => {
            const result = SplitCalculatorService.calculateSplit(27.53, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].fixedValue).toBe(25.53);
        });
    });

    describe('calculateSplit - Split Percentual', () => {
        beforeEach(() => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '10';
            process.env.AS_SPLIT_SYSTEM_FIXED = '2.00'; // Será ignorado quando percent > 0
        });

        test('calcula split percentual corretamente', () => {
            const result = SplitCalculatorService.calculateSplit(100.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split).toEqual([
                {
                    walletId: validWalletId,
                    percentualValue: 90 // Seller fica com 100 - 10 = 90%
                }
            ]);
        });

        test('usa percentual em vez de fixo quando percent > 0', () => {
            const result = SplitCalculatorService.calculateSplit(5.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0]).toHaveProperty('percentualValue');
            expect(result.split[0]).not.toHaveProperty('fixedValue');
            expect(result.split[0].percentualValue).toBe(90);
        });

        test('bloqueia quando percentual >= 100', () => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '100';
            const result = SplitCalculatorService.calculateSplit(50.00, validWalletId);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('menor que 100%');
        });

        test('bloqueia quando percentual > 100', () => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '150';
            const result = SplitCalculatorService.calculateSplit(50.00, validWalletId);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('menor que 100%');
        });

        test('aceita percentual 0 (seller fica com 100%)', () => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '0.01'; // > 0 mas quase zero
            const result = SplitCalculatorService.calculateSplit(100.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].percentualValue).toBe(99.99);
        });

        test('calcula corretamente com percentuais decimais', () => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '7.5';
            const result = SplitCalculatorService.calculateSplit(100.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].percentualValue).toBe(92.5);
        });

        test('aceita valor baixo com split percentual (diferente do fixo)', () => {
            // Com fixo de R$2, valor de R$1 seria bloqueado
            // Mas com percentual, qualquer valor > 0 é aceito
            const result = SplitCalculatorService.calculateSplit(1.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].percentualValue).toBe(90);
        });
    });

    describe('calculateSplit - Validação de Wallet', () => {
        beforeEach(() => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '0';
            process.env.AS_SPLIT_SYSTEM_FIXED = '2.00';
        });

        test('bloqueia quando seller não tem walletId', () => {
            const result = SplitCalculatorService.calculateSplit(25.00, null);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('não possui carteira configurada');
            expect(result.error.status).toBe(400);
        });

        test('bloqueia quando walletId é undefined', () => {
            const result = SplitCalculatorService.calculateSplit(25.00, undefined);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('não possui carteira configurada');
        });

        test('bloqueia quando walletId é string vazia', () => {
            const result = SplitCalculatorService.calculateSplit(25.00, '');

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('não possui carteira configurada');
        });
    });

    describe('validateSellerForSplit', () => {
        test('valida seller com wallet configurada', () => {
            const seller = {
                id: 1,
                subaccount_wallet_id: validWalletId
            };

            const result = SplitCalculatorService.validateSellerForSplit(seller);

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('bloqueia quando seller é null', () => {
            const result = SplitCalculatorService.validateSellerForSplit(null);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('não encontrado');
            expect(result.error.status).toBe(404);
        });

        test('bloqueia quando seller é undefined', () => {
            const result = SplitCalculatorService.validateSellerForSplit(undefined);

            expect(result.success).toBe(false);
            expect(result.error.status).toBe(404);
        });

        test('bloqueia quando seller não tem subaccount_wallet_id', () => {
            const seller = {
                id: 1,
                subaccount_wallet_id: null
            };

            const result = SplitCalculatorService.validateSellerForSplit(seller);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('não possui carteira configurada');
            expect(result.error.status).toBe(400);
        });

        test('bloqueia quando subaccount_wallet_id é string vazia', () => {
            const seller = {
                id: 1,
                subaccount_wallet_id: ''
            };

            const result = SplitCalculatorService.validateSellerForSplit(seller);

            expect(result.success).toBe(false);
            expect(result.error.message).toContain('não possui carteira configurada');
        });
    });

    describe('Configuração via Environment Variables', () => {
        test('usa valores padrão quando env vars não estão definidas', () => {
            delete process.env.AS_SPLIT_SYSTEM_PERCENT;
            delete process.env.AS_SPLIT_SYSTEM_FIXED;

            const result = SplitCalculatorService.calculateSplit(25.00, validWalletId);

            // Padrão: percent=0, fixed=2.0
            expect(result.success).toBe(true);
            expect(result.split[0].fixedValue).toBe(23.00);
        });

        test('converte string para número corretamente', () => {
            process.env.AS_SPLIT_SYSTEM_FIXED = '3.50';
            const result = SplitCalculatorService.calculateSplit(10.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].fixedValue).toBe(6.50);
        });

        test('prioriza percentual sobre fixo quando ambos configurados', () => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '15';
            process.env.AS_SPLIT_SYSTEM_FIXED = '5.00';

            const result = SplitCalculatorService.calculateSplit(100.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0]).toHaveProperty('percentualValue', 85);
            expect(result.split[0]).not.toHaveProperty('fixedValue');
        });
    });

    describe('Edge Cases e Cenários Extremos', () => {
        beforeEach(() => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '0';
            process.env.AS_SPLIT_SYSTEM_FIXED = '2.00';
        });

        test('valor muito alto (R$ 10.000,00)', () => {
            const result = SplitCalculatorService.calculateSplit(10000.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].fixedValue).toBe(9998.00);
        });

        test('valor mínimo válido (taxa + 0.01)', () => {
            const result = SplitCalculatorService.calculateSplit(2.01, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].fixedValue).toBeCloseTo(0.01, 2);
        });

        test('taxa fixa de R$ 0 (todo valor vai para seller)', () => {
            process.env.AS_SPLIT_SYSTEM_FIXED = '0';
            const result = SplitCalculatorService.calculateSplit(50.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].fixedValue).toBe(50.00);
        });

        test('percentual 99% (seller fica com 1%)', () => {
            process.env.AS_SPLIT_SYSTEM_PERCENT = '99';
            const result = SplitCalculatorService.calculateSplit(100.00, validWalletId);

            expect(result.success).toBe(true);
            expect(result.split[0].percentualValue).toBe(1);
        });
    });
});
