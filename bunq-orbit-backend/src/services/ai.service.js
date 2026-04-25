// Mocking AI capabilities for the Hackathon prototype

/**
 * Mocks the extraction of invoice data
 */
async function analyzeInvoice(invoiceData) {
  // In reality, this would send an image or text to an LLM to extract JSON.
  // We'll simulate a slight delay and return the parsed structure.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        merchant: "Graphic Designer",
        amount: "500.00",
        currency: "EUR",
        vat: "21%",
        category: "Marketing",
        due_date: "2026-05-10",
        counterparty_email: "designer@example.com",
        duplicate_risk: false
      });
    }, 1000);
  });
}

/**
 * Checks if a parsed invoice might be a duplicate based on recent payments
 */
function detectDuplicate(parsedInvoice, recentPayments) {
  for (const payment of recentPayments) {
    // Basic check: same amount and similar counterparty
    const paymentAmount = payment?.amount?.value ? parseFloat(payment.amount.value) : 0;
    const parsedAmount = parseFloat(parsedInvoice.amount);
    
    const paymentCounterparty = payment?.counterparty?.toLowerCase() || '';
    const parsedMerchant = parsedInvoice.merchant?.toLowerCase()?.split(' ')[0] || '';

    if (
      Math.abs(paymentAmount - parsedAmount) === 0 &&
      paymentCounterparty.includes(parsedMerchant)
    ) {
      return {
        isDuplicate: true,
        matchedPaymentId: payment.id,
        reason: "Matched amount and merchant name in recent transactions."
      };
    }
  }
  return { isDuplicate: false };
}

/**
 * Mocks the cash flow insight generation based on account and payment data
 */
async function generateCashflowInsight(accounts, recentPayments) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Logic could aggregate balances and burn rate.
      // Mocked output for the demo:
      resolve({
        runway_months: 8.5,
        monthly_burn: 4200,
        upcoming_liabilities: [
            { name: "Q2 VAT Tax", amount: 2000, due_date: "2026-06-30" }
        ],
        suggestion: "You have a large tax payment expected in June. Consider moving €2,000 to your Tax Savings sub-account.",
        action: "create_draft_transfer",
        suggested_transfer: {
          amount: "2000.00",
          currency: "EUR",
          to_account: "Tax Savings",
          description: "Internal transfer for Q2 VAT Tax"
        }
      });
    }, 1500);
  });
}

module.exports = {
  analyzeInvoice,
  detectDuplicate,
  generateCashflowInsight
};
