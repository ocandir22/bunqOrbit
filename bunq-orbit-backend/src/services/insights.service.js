const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
const bunqService = require('./bunq.service');

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
const modelId = process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-sonnet-4-20250514-v1:0";

async function analyzeCashFlow(accountId) {
  try {
    const accounts = await bunqService.getAccounts();
    const primary = accounts.find(a => a.id == accountId) || accounts[0];
    const payments = await bunqService.getPayments(accountId);

    const currentBalance = parseFloat(primary.balance.value);
    const currency = primary.balance.currency;

    // 1. DETERMINISTIC HISTORY CALCULATION
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    let historicalForecast = [];
    let runningBalance = currentBalance;

    // Build 6 months of REAL history
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const monthName = months[monthIdx];

      historicalForecast.unshift({
        month: monthName,
        balance: Math.round(runningBalance * 100) / 100,
        type: 'actual'
      });

      // Calculate net change for this month to find previous balance
      const monthlyNet = payments
        .filter(p => {
          const pDate = new Date(p.created);
          return pDate.getMonth() === monthIdx && pDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, p) => sum + parseFloat(p.amount.value), 0);
      
      runningBalance -= monthlyNet;
    }

    const systemPrompt = `You are a Senior Financial Analyst for bunqOrbit. 
Analyze this confirmed historical data and provide a 3-month predictive forecast.

CONFIRMED HISTORY: ${JSON.stringify(historicalForecast)}

Tasks:
1. Keep the CONFIRMED HISTORY exactly as provided.
2. Predict the NEXT 3 months based on current trends.
3. Identify major risks (like the $2,000 tax due in June).
4. Provide actionable insights.

Response MUST be valid JSON:
{
  "monthlyBurn": number,
  "runwayMonths": number,
  "forecast": [
     // Full 9-month array: 6 months ACTUAL + 3 months PREDICTED
  ],
  "insights": [{"title": "string", "description": "string", "type": "warning"}],
  "voiceSummary": "string"
}`;

    const userMessage = `Current Balance: ${currentBalance} ${currency}. Upcoming Tax: $2000 in June. Generate report.`;

    const command = new ConverseCommand({
      modelId,
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      system: [{ text: systemPrompt }],
      inferenceConfig: { maxTokens: 1000, temperature: 0.0 }
    });

    const response = await client.send(command);
    const responseText = response.output.message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);

  } catch (error) {
    console.error('Error in analyzeCashFlow:', error);
    throw error;
  }
}

module.exports = {
  analyzeCashFlow
};
