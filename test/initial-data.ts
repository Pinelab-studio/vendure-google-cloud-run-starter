import { InitialData, LanguageCode, PaymentMethodHandler } from "@vendure/core";

/**
 * Test payment method which always settles immediately
 */
export const testPaymentMethod = new PaymentMethodHandler({
    code: 'test-payment-method',
    description: [
        { languageCode: LanguageCode.en, value: 'Test Payment Method' },
    ],
    args: {},
    createPayment: (ctx, order, amount, args, metadata) => {
        return {
            amount,
            state: 'Settled',
            transactionId: '12345',
            metadata: { public: metadata },
        };
    },
    settlePayment: () => ({
        success: true,
    }),
});

export const initialData: InitialData = {
    defaultLanguage: LanguageCode.en,
    defaultZone: 'NL',
    taxRates: [
        { name: 'Standard Tax', percentage: 21 },
        { name: 'Reduced Tax', percentage: 9 },
        { name: 'Zero Tax', percentage: 0 },
    ],
    shippingMethods: [
        { name: 'default shipping', price: 500 },
        { name: 'shipping by zone', price: 600 },
    ],
    paymentMethods: [
        {
            name: testPaymentMethod.code,
            handler: { code: testPaymentMethod.code, arguments: [] },
        },
    ],
    countries: [{ name: 'Nederland', code: 'NL', zone: 'NL' }],
    collections: [
        {
            name: 'Electronics',
            filters: [
                {
                    code: 'facet-value-filter',
                    args: { facetValueNames: ['electronics'], containsAny: false },
                },
            ],
        },
    ],
};