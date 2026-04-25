const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
require('dotenv').config();

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

/**
 * Calls Amazon Bedrock Converse API to extract invoice data.
 * @param {Buffer} imageBuffer 
 * @param {string} mimeType 
 */
async function analyzeInvoiceImage(imageBuffer, mimeType) {
  const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-7-sonnet-20250219-v1:0";

  let format = mimeType.split('/')[1];
  if (format === 'jpg') format = 'jpeg';
  if (!['jpeg', 'png', 'webp', 'gif'].includes(format)) {
    throw new Error(`Unsupported image format: ${format}`);
  }

  const systemPrompt = `You are an expert financial AI assistant. Your task is to extract details from invoices/receipts and return them strictly in JSON format. Do not include any other text, markdown blocks, or explanations.
If a field is missing or cannot be found, return null. Do not hallucinate data like IBANs or emails if they are not explicitly present.

Required JSON format:
{
  "vendor": "string or null",
  "invoice_number": "string or null",
  "amount": "string or null",
  "currency": "string or null (MUST be exactly 3-letter ISO code like EUR, USD, INR)",
  "vat": "string or null",
  "tax_amount": "string or null",
  "category": "string or null",
  "date": "string or null",
  "due_date": "string or null",
  "counterparty_email": "string or null",
  "iban": "string or null",
  "description": "string or null",
  "line_items": [],
  "confidence": 0.0 to 1.0
}`;

  const command = new ConverseCommand({
    modelId,
    messages: [
      {
        role: "user",
        content: [
          {
            image: {
              format: format,
              source: {
                bytes: imageBuffer
              }
            }
          },
          {
            text: "Extract the data from this invoice image according to the system instructions."
          }
        ]
      }
    ],
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      maxTokens: 2000,
      temperature: 0.0
    }
  });

  try {
    const response = await client.send(command);
    const responseText = response.output.message.content[0].text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error calling Bedrock:", error);
    throw error;
  }
}

module.exports = {
  analyzeInvoiceImage
};
