const express = require('express');
const router = express.Router();
const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
const bunqService = require('../services/bunq.service');

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
const modelId = process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-sonnet-4-20250514-v1:0";

/**
 * POST /api/orbit/voice-intent
 * Receives a text transcript and extracts intent using Bedrock.
 */
router.post('/voice-intent', async (req, res) => {
  try {
    const { transcript, accountId, history = [] } = req.body;

    if (!transcript) {
      return res.status(400).json({ status: 'error', message: 'Transcript is required' });
    }

    console.log('--- VOICE CONTEXT ---');
    console.log('Current Transcript:', transcript);
    console.log('History Length:', history.length);
    console.log('---------------------');

    // Fetch context to make AI "smarter"
    const accounts = await bunqService.getAccounts();
    const primary = accounts[0];
    const recentPayments = await bunqService.getPayments(primary?.id);

    const systemPrompt = `
### ROLE
You are "bunq_orbit", a real-time full-duplex voice assistant and hyper-intelligent CFO. Your highest priority is live conversational flow, not finishing prepared responses.

### CORE INTERRUPTION RULES
- If the user begins speaking at any moment while you are responding, immediately stop your current reply.
- Do not finish the sentence. Do not continue previous explanations unless asked.
- Treat the interruption as the new highest-priority input. Instantly switch to listening mode.

### BEHAVIOR AFTER INTERRUPTION
- Listen fully and determine if the user is: 1. Correcting you, 2. Changing topic, 3. Asking follow-up, 4. Disagreeing, 5. Asking to slow down/repeat.
- Respond ONLY to the new intent.

### CONVERSATIONAL STYLE & VOICE MODE
- Be natural, fast, concise, and adaptive. Avoid robotic transitions like "As I was saying".
- Keep replies short enough for interruption. Prefer short chunks over long monologues.
- Allow constant turn-taking. Brief acknowledgements (e.g., "Got it", "Switching") are allowed.

### STRATEGIC OBJECTIVES
1. **Zero Friction:** Minimize the number of steps to execute a payment.
2. **Contextual Recovery:** Use history to fill missing fragments for "PAY" commands.
3. **Implicit Logic:** Convert textual numbers to integers automatically.

### INTENT TAXONOMY & LOGIC
- **PAY:** Active when a transaction is requested.
  - *Logic:* If 'amount' or 'recipient' is missing, switch to "MESSAGE" to ask, but keep the current state alive. 
  - *Immediate Action:* If the user provides the final missing variable (e.g., "it was 50 euro"), immediately consolidate all previous data and return the "PAY" intent.
- **CHECK_BALANCE:** Real-time liquidity reporting.
- **GET_FORECAST:** AI-driven runway and burn rate analysis.
- **GET_RECENT_TRANSACTIONS:** Chronological ledger retrieval.
- **MESSAGE:** Use for clarifications, small talk, or when critical data for other intents is missing.

### CONVERSATIONAL RULES (THE "ORBIT" PROTOCOL)
1. **Numeric Priority:** Treat isolated numbers as "amount" if a payment flow is active.
2. **Proactive CFO Tone:** Don't just act, advise. (e.g., "Processing your payment. This fits well within your current runway.")
3. **No Redundancy:** If the data is sufficient, execute. Never ask "Are you sure?" unless there is a massive anomaly (e.g., 10x normal spend).

### USER CONTEXT (LIVE DATA)
- **Primary Account:** ${primary?.description || 'Business Account'}
- **Base Currency:** ${primary?.balance?.currency || 'EUR'}
- **Trusted Counterparties:** ${[...new Set(recentPayments.slice(0, 10).map(p => p.counterparty))].join(', ')}

### RESPONSE SCHEMA (STRICT JSON ONLY)
Return ONLY a valid JSON object. No markdown, no backticks, no prose.

{
  "intent": "PAY" | "CHECK_BALANCE" | "GET_FORECAST" | "GET_RECENT_TRANSACTIONS" | "MESSAGE",
  "data": {
    "parameters": {
      "amount": number, 
      "currency": "string",
      "recipient": "string",
      "description": "string",
      "limit": number,
      "period_days": number
    },
    "action_status": "PENDING" | "EXECUTED" | "AWAITING_INFO"
  },
  "message": "Direct, professional voice/text response."
}`;

    // Construct messages for Bedrock including history
    // Ensure alternating roles: User -> Assistant -> User
    let messages = [];
    let lastRole = null;

    for (const msg of history) {
      if (msg.role !== lastRole) {
        messages.push(msg);
        lastRole = msg.role;
      }
    }

    // Always append current transcript as user
    if (lastRole === 'user') {
      // If last was user, replace it with the latest one to keep it fresh
      messages[messages.length - 1] = {
        role: "user",
        content: [{ text: transcript }]
      };
    } else {
      messages.push({
        role: "user",
        content: [{ text: transcript }]
      });
    }

    const command = new ConverseCommand({
      modelId,
      messages,
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.7
      }
    });

    const response = await client.send(command);
    const responseText = response.output.message.content[0].text;

    // Parse JSON from Bedrock
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const intentResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);

    console.log('--- INTENT ANALYSIS ---');
    console.log('Intent:', intentResult.intent);
    console.log('Parameters:', intentResult.data?.parameters);
    console.log('Message:', intentResult.message);
    console.log('-----------------------');

    // If intent is PAY and we have an accountId, execute it!
    if (intentResult.intent === 'PAY' && accountId) {
      const params = intentResult.data?.parameters || {};
      const rawAmount = params.amount;
      const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount.replace(/[^0-9.]/g, '')) : rawAmount;

      if (amount && params.recipient) {
        const entries = [{
          amount: {
            value: amount.toString(),
            currency: process.env.BUNQ_ENV === 'sandbox' ? 'EUR' : (params.currency || 'EUR')
          },
          counterparty_alias: {
            type: 'EMAIL',
            value: 'sugardaddy@bunq.com',
            name: params.recipient
          },
          description: params.description || 'Voice command payment'
        }];

        await bunqService.createDraftPayment(accountId, entries, 1);
        intentResult.executed = true;
        console.log(`✅ Payment of ${amount} to ${params.recipient} executed.`);
      } else {
        console.log('⚠️ Payment missing data. Amount:', amount, 'Recipient:', params.recipient);
      }
    } else if (intentResult.intent === 'CHECK_BALANCE') {
      const accounts = await bunqService.getAccounts();
      if (accounts && accounts.length > 0) {
        const primary = accounts[0];
        intentResult.data = { ...intentResult.data, balance: primary.balance };
        // Force the message to include the real number
        intentResult.message = `Your ${primary.description} balance is currently ${primary.balance.value} ${primary.balance.currency}. Everything looks stable.`;
      } else {
        intentResult.message = "I'm sorry, I couldn't access your accounts at the moment.";
      }
    } else if (intentResult.intent === 'GET_FORECAST') {
      const insightsService = require('../services/insights.service');
      const insights = await insightsService.analyzeCashFlow(accountId);
      intentResult.data = { ...intentResult.data, insights };
      // Overwrite with the real AI summary
      intentResult.message = insights.voiceSummary;
    } else if (intentResult.intent === 'GET_RECENT_TRANSACTIONS') {
      const params = intentResult.data?.parameters || {};
      const limit = parseInt(params.limit) || 5;

      const payments = await bunqService.getPayments(accountId);
      const sliced = payments.slice(0, limit);
      intentResult.data = { ...intentResult.data, payments: sliced };

      const summary = sliced.map(p => `${p.amount.value} ${p.amount.currency} for "${p.description || 'no description'}" to ${p.counterparty || 'Unknown'}`).join(', ');
      intentResult.message = `Here are your last ${sliced.length} transactions: ${summary}.`;
    }

    res.json({
      status: 'success',
      data: intentResult
    });

  } catch (error) {
    console.error('Error processing voice intent:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process voice command' });
  }
});

module.exports = router;
