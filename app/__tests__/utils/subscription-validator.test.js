const subscriptionValidator = require('../../utils/subscription-validator');
const SellerSubscription = require('../../models/SellerSubscription');
const { formatError, createError } = require('../../utils/errorHandler');

// Mock dos modelos
jest.mock('../../models/SellerSubscription');

describe('SubscriptionValidator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateSellerSubscription', () => {
        it('should return error if sellerId is not provided', async () => {
            const result = await subscriptionValidator.validateSellerSubscription();
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do vendedor é obrigatório');
            expect(result.status).toBe(400);
        });

        it('should return error if seller has no subscription', async () => {
            SellerSubscription.findOne.mockResolvedValue(null);
            
            const result = await subscriptionValidator.validateSellerSubscription(1);
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('O vendedor não possui assinatura ativa. Para utilizar este serviço é necessário ter uma assinatura válida.');
            expect(result.status).toBe(403);
        });

        it('should return error if subscription is overdue', async () => {
            const mockSubscription = {
                id: 1,
                seller_id: 1,
                status: 'overdue',
                next_due_date: new Date('2025-01-01'),
                plan_name: 'FREE'
            };
            
            SellerSubscription.findOne.mockResolvedValue(mockSubscription);
            
            const result = await subscriptionValidator.validateSellerSubscription(1);
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('A assinatura do vendedor está vencida. Renove sua assinatura para continuar utilizando o serviço.');
            expect(result.status).toBe(403);
        });

        it('should return error if subscription is inactive', async () => {
            const mockSubscription = {
                id: 1,
                seller_id: 1,
                status: 'inactive',
                next_due_date: new Date('2025-12-31'),
                plan_name: 'FREE'
            };
            
            SellerSubscription.findOne.mockResolvedValue(mockSubscription);
            
            const result = await subscriptionValidator.validateSellerSubscription(1);
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('A assinatura do vendedor está inativa. Ative sua assinatura para utilizar este serviço.');
            expect(result.status).toBe(403);
        });

        it('should return error if subscription is canceled', async () => {
            const mockSubscription = {
                id: 1,
                seller_id: 1,
                status: 'canceled',
                next_due_date: new Date('2025-12-31'),
                plan_name: 'FREE'
            };
            
            SellerSubscription.findOne.mockResolvedValue(mockSubscription);
            
            const result = await subscriptionValidator.validateSellerSubscription(1);
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('A assinatura do vendedor está inativa. Ative sua assinatura para utilizar este serviço.');
            expect(result.status).toBe(403);
        });

        it('should return error if active subscription is past due date', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1); // ontem
            
            const mockSubscription = {
                id: 1,
                seller_id: 1,
                status: 'pending',
                next_due_date: pastDate,
                plan_name: 'FREE'
            };
            
            SellerSubscription.findOne.mockResolvedValue(mockSubscription);
            
            const result = await subscriptionValidator.validateSellerSubscription(1);
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('A assinatura do vendedor está vencida. Renove sua assinatura para continuar utilizando o serviço.');
            expect(result.status).toBe(403);
        });

        it('should return success for active subscription', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30); // 30 dias no futuro
            
            const mockSubscription = {
                id: 1,
                seller_id: 1,
                status: 'active',
                next_due_date: futureDate,
                plan_name: 'FREE'
            };
            
            SellerSubscription.findOne.mockResolvedValue(mockSubscription);
            
            const result = await subscriptionValidator.validateSellerSubscription(1);
            
            expect(result.success).toBe(true);
            expect(result.subscription).toEqual(mockSubscription);
        });

        it('should return success for active subscription even if past due date', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1); // ontem
            
            const mockSubscription = {
                id: 1,
                seller_id: 1,
                status: 'active',
                next_due_date: pastDate,
                plan_name: 'FREE'
            };
            
            SellerSubscription.findOne.mockResolvedValue(mockSubscription);
            
            const result = await subscriptionValidator.validateSellerSubscription(1);
            
            expect(result.success).toBe(true);
            expect(result.subscription).toEqual(mockSubscription);
        });
    });

    describe('checkSubscriptionMiddleware', () => {
        it('should return error if subscription is invalid', async () => {
            SellerSubscription.findOne.mockResolvedValue(null);
            
            const result = await subscriptionValidator.checkSubscriptionMiddleware(1);
            
            expect(result).not.toBeNull();
            expect(result.success).toBe(false);
            expect(result.status).toBe(403);
        });

        it('should return null if subscription is valid', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            
            const mockSubscription = {
                id: 1,
                seller_id: 1,
                status: 'active',
                next_due_date: futureDate,
                plan_name: 'FREE'
            };
            
            SellerSubscription.findOne.mockResolvedValue(mockSubscription);
            
            const result = await subscriptionValidator.checkSubscriptionMiddleware(1);
            
            expect(result).toBeNull();
        });
    });
});
