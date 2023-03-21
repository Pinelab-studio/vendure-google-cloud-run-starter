import {
  Order,
  OrderState,
  RequestContext,
  StockAllocationStrategy,
} from '@vendure/core';

/**
 * Only allocate stock to orders when PaymentSettled
 */
export class AllocateStockOnSettlementStrategy
  implements StockAllocationStrategy
{
  shouldAllocateStock(
    ctx: RequestContext,
    fromState: OrderState,
    toState: OrderState,
    order: Order
  ): boolean | Promise<boolean> {
    return toState === 'PaymentSettled';
  }
}
