/**
 * Duka Letu - LangChain Structured Tools & Function Calling Suite
 * Exposes type-safe callable tools matching LangChain tool interfaces.
 */

export interface ToolCallRecord {
  name: string;
  args: Record<string, any>;
  result: any;
  timestamp: string;
}

export const dukaLetuTools = {
  /**
   * Tool: Track Customer Order Status
   */
  trackOrder: (args: { orderId: string }) => {
    const cleanId = args.orderId.toUpperCase().trim().replace(/^#/, '');
    const mockOrders: Record<string, { item: string; status: string; date: string; carrier: string; trackingNum: string }> = {
      'OMNI-99321': { item: 'Leather Running Shoes', status: 'Out for Delivery', date: '2026-06-25', carrier: 'DukaExpress', trackingNum: 'DX-98831' },
      'OMNI-88221': { item: 'Cotton Comfort Hoodie', status: 'Delivered', date: '2026-06-10', carrier: 'DukaExpress', trackingNum: 'DX-77124' },
      'OMNI-77110': { item: 'Wireless Sport Earbuds', status: 'Delivered', date: '2026-05-20', carrier: 'DHL', trackingNum: 'DHL-55210' },
      'OMNI-66554': { item: 'Smart Fitness Band', status: 'In Transit', date: '2026-07-02', carrier: 'Fargo Courier', trackingNum: 'FC-11029' },
    };

    const order = mockOrders[cleanId];
    if (order) {
      return {
        success: true,
        orderId: cleanId,
        item: order.item,
        status: order.status,
        date: order.date,
        carrier: order.carrier,
        trackingNumber: order.trackingNum,
        message: `Order ${cleanId} (${order.item}) is currently ${order.status} via ${order.carrier}.`
      };
    }

    return {
      success: false,
      orderId: cleanId,
      message: `Order reference ${cleanId} was not found in our live fulfillment records.`
    };
  },

  /**
   * Tool: Process Refund Request
   */
  processRefund: (args: { orderId: string; amount?: number; reason?: string }) => {
    const cleanId = args.orderId.toUpperCase().trim().replace(/^#/, '');
    const validOrders = ['OMNI-99321', 'OMNI-88221', 'OMNI-77110', 'OMNI-66554'];

    if (validOrders.includes(cleanId)) {
      const refundId = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
      const amount = args.amount || 89.99;
      return {
        success: true,
        refundId,
        orderId: cleanId,
        amount,
        currency: 'KES / USD',
        status: 'Approved & Initiated via Original Payment Channel',
        estimatedSettlementDays: '3-5 business days',
        reason: args.reason || 'Customer request under 30-day warranty'
      };
    }

    return {
      success: false,
      orderId: cleanId,
      message: `Cannot issue refund: Order ${cleanId} not found or outside policy window.`
    };
  },

  /**
   * Tool: Verify M-Pesa / Card Payment
   */
  verifyPayment: (args: { transactionId: string }) => {
    const cleanTxn = args.transactionId.toUpperCase().trim();
    const mockTxns: Record<string, { amount: number; status: string; date: string; method: string; customer: string }> = {
      'TXN-11022': { amount: 89.99, status: 'Completed', date: '2026-06-25', method: 'M-Pesa Express', customer: 'Alex Customer' },
      'TXN-88291': { amount: 45.00, status: 'Completed', date: '2026-06-10', method: 'Visa Debit', customer: 'Alex Customer' },
      'MPESA-QW9988': { amount: 120.50, status: 'Completed', date: '2026-07-01', method: 'M-Pesa Paybill', customer: 'Juma K.' }
    };

    const txn = mockTxns[cleanTxn];
    if (txn) {
      return {
        success: true,
        transactionId: cleanTxn,
        amount: txn.amount,
        status: txn.status,
        paymentMethod: txn.method,
        date: txn.date,
        message: `Transaction ${cleanTxn} of $${txn.amount} verified successfully via ${txn.method}.`
      };
    }

    return {
      success: false,
      transactionId: cleanTxn,
      message: `Transaction ID ${cleanTxn} is pending confirmation or not recorded in the payment gateway.`
    };
  },

  /**
   * Tool: Escalate to Human Support Agent
   */
  escalateToHuman: (args: { customerId?: string; reason: string; priority?: 'normal' | 'high' | 'urgent' }) => {
    const ticketId = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      ticketId,
      priority: args.priority || 'high',
      status: 'Escalated to Tier-2 Human Agent',
      queueWaitTime: '< 2 minutes',
      message: `Live support ticket ${ticketId} created. Customer transferred to human queue.`
    };
  }
};
