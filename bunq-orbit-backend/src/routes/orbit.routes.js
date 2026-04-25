const express = require('express');
const multer = require('multer');
const router = express.Router();
const bunqService = require('../services/bunq.service');
const aiService = require('../services/ai.service');
const bedrockVisionService = require('../services/bedrockVision.service');
const insightsService = require('../services/insights.service');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_MB || 10) * 1024 * 1024 }
});

// 3. POST /api/orbit/analyze-invoice-mock
router.post('/analyze-invoice-mock', async (req, res) => {
  try {
    // In reality, req.body might contain a file or raw text.
    // We pass it to our mocked AI service.
    const rawData = req.body;
    
    // 1. Analyze via AI
    const parsedInvoice = await aiService.analyzeInvoice(rawData);
    
    // 2. Fetch Accounts
    const accounts = await bunqService.getAccounts();
    if (!accounts || accounts.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No active accounts found to verify duplicates.' });
    }
    
    // 3. Fetch recent payments for primary account to detect duplicates
    const primaryAccountId = accounts[0].id; // Assuming the first is the primary business account
    const recentPayments = await bunqService.getPayments(primaryAccountId);
    
    // 4. Compare with history
    const duplicateCheck = aiService.detectDuplicate(parsedInvoice, recentPayments);
    
    parsedInvoice.duplicate_risk = duplicateCheck.isDuplicate;
    
    // 5. Suggest an action
    let suggestedAction = 'create_draft_payment';
    let suggestionText = 'No duplicates found. You can safely create a draft payment.';
    
    if (duplicateCheck.isDuplicate) {
      suggestedAction = 'mark_as_duplicate';
      suggestionText = `High duplicate risk! This looks like a recent payment (${duplicateCheck.reason}).`;
    }

    res.json({
      status: 'success',
      data: {
        invoice: parsedInvoice,
        suggested_action: suggestedAction,
        suggestion_text: suggestionText,
        duplicate_check: duplicateCheck
      }
    });

  } catch (error) {
    console.error('Error analyzing mocked invoice:', error);
    res.status(500).json({ status: 'error', message: 'Failed to analyze invoice' });
  }
});

// 4. POST /api/orbit/analyze-invoice-file
router.post('/analyze-invoice-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No image file provided' });
    }

    // 1. Analyze via Bedrock
    const parsedInvoice = await bedrockVisionService.analyzeInvoiceImage(req.file.buffer, req.file.mimetype);
    
    // Normalize Bedrock keys to match old frontend logic for duplicate check
    parsedInvoice.merchant = parsedInvoice.vendor || parsedInvoice.merchant;
    if (!parsedInvoice.amount && parsedInvoice.total_amount) {
      parsedInvoice.amount = parsedInvoice.total_amount;
    }

    // 2. Fetch Accounts
    const accounts = await bunqService.getAccounts();
    if (!accounts || accounts.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No active accounts found to verify duplicates.' });
    }
    
    // 3. Fetch recent payments for primary account to detect duplicates
    const primaryAccountId = accounts[0].id;
    const recentPayments = await bunqService.getPayments(primaryAccountId);
    
    // 4. Compare with history
    const duplicateCheck = aiService.detectDuplicate(parsedInvoice, recentPayments);
    
    parsedInvoice.duplicate_risk = duplicateCheck.isDuplicate;
    
    // 5. Suggest an action
    let suggestedAction = 'create_draft_payment';
    let suggestionText = 'No duplicates found. You can safely create a draft payment.';
    
    if (duplicateCheck.isDuplicate) {
      suggestedAction = 'mark_as_duplicate';
      suggestionText = `High duplicate risk! This looks like a recent payment (${duplicateCheck.reason}).`;
    }

    res.json({
      status: 'success',
      data: {
        invoice: parsedInvoice,
        suggested_action: suggestedAction,
        suggestion_text: suggestionText,
        duplicate_check: duplicateCheck
      }
    });

  } catch (error) {
    console.error('Error analyzing uploaded invoice:', error);
    res.status(500).json({ status: 'error', message: 'Failed to analyze uploaded invoice' });
  }
});

// 5. GET /api/orbit/insights
router.get('/insights', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    if (!accountId) {
      return res.status(400).json({ status: 'error', message: 'accountId is required' });
    }

    const insights = await insightsService.analyzeCashFlow(accountId);
    res.json({ status: 'success', data: insights });

  } catch (error) {
    console.error('Error generating real-time insights:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate insights' });
  }
});

// 6. GET /api/orbit/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const accounts = await bunqService.getAccounts();
    const primaryAccountId = accounts.length > 0 ? accounts[0].id : null;
    
    let recentPayments = [];
    let cashflowInsight = null;
    
    if (primaryAccountId) {
      recentPayments = await bunqService.getPayments(primaryAccountId);
      // Use the new real analysis service
      try {
        cashflowInsight = await insightsService.analyzeCashFlow(primaryAccountId);
      } catch (e) {
        console.warn("Real-time analysis failed, falling back to mock:", e.message);
        cashflowInsight = await aiService.generateCashflowInsight(accounts, recentPayments);
      }
    }

    res.json({
      status: 'success',
      data: {
        company: process.env.BUNQ_COMPANY_NAME || "Company",
        accounts: accounts,
        recentPayments: recentPayments,
        cashflowInsight: cashflowInsight,
        demoReady: accounts.length > 0 && recentPayments.length > 0
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load dashboard data' });
  }
});

module.exports = router;
