const express = require('express');
const router = express.Router();
const bunqService = require('../services/bunq.service');

// 1. GET /api/bunq/accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await bunqService.getAccounts();
    res.json({ status: 'success', data: accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error.response?.data || error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch accounts' });
  }
});

// 2. GET /api/bunq/accounts/:accountId/payments
router.get('/accounts/:accountId/payments', async (req, res) => {
  try {
    const { accountId } = req.params;
    const payments = await bunqService.getPayments(accountId);
    res.json({ status: 'success', data: payments });
  } catch (error) {
    console.error(`Error fetching payments for account ${req.params.accountId}:`, error.response?.data || error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payments' });
  }
});

// 4. POST /api/bunq/draft-payment
router.post('/draft-payment', async (req, res) => {
  try {
    let { 
      accountId, 
      amount, 
      currency = 'EUR', 
      counterpartyEmail, 
      counterpartyName, 
      description 
    } = req.body;
    
    if (!accountId || !amount || !counterpartyEmail || !counterpartyName) {
      return res.status(400).json({ status: 'error', message: 'Invalid payload. Required: accountId, amount, counterpartyEmail, counterpartyName' });
    }

    // Sandbox requires a valid alias. Fallback to sugardaddy@bunq.com for testing.
    const safeCounterpartyEmail = process.env.BUNQ_ENV === 'sandbox' 
      ? 'sugardaddy@bunq.com' 
      : counterpartyEmail;

    // Sanitize currency for bunq (must be 3-letter code)
    if (currency === '₹') currency = 'INR';
    if (currency === '$') currency = 'USD';
    if (currency === '€') currency = 'EUR';
    if (currency === '£') currency = 'GBP';
    if (currency.length !== 3) currency = 'EUR'; // Fallback to avoid bunq API crash

    // Bunq Sandbox often throws 500 on draft payments with non-EUR currencies
    const safeCurrency = process.env.BUNQ_ENV === 'sandbox' ? 'EUR' : currency;

    const entries = [{
      amount: { value: amount, currency: safeCurrency },
      counterparty_alias: {
        type: 'EMAIL',
        value: safeCounterpartyEmail,
        name: counterpartyName
      },
      description: description || ''
    }];

    const result = await bunqService.createDraftPayment(accountId, entries, 1);
    res.json({ 
      status: 'success', 
      message: 'Draft payment created successfully. Please approve it in the bunq app.', 
      data: result 
    });
  } catch (error) {
    console.error('Error creating draft payment:', error.response?.data || error.message);
    res.status(500).json({ status: 'error', message: 'Failed to create draft payment' });
  }
});

// 5. POST /api/bunq/seed-demo
router.post('/seed-demo', async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ status: 'error', message: 'Required: accountId' });
    }
    
    await bunqService.seedDemoData(accountId);
    res.json({ status: 'success', message: 'Demo data seeded successfully.' });
  } catch (error) {
    console.error('Error seeding demo data:', error.response?.data || error.message);
    res.status(500).json({ status: 'error', message: 'Failed to seed demo data' });
  }
});

module.exports = router;
