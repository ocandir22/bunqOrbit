require('dotenv').config();
const bunqService = require('./src/services/bunq.service');

async function checkDrafts() {
  try {
    console.log("Fetching monetary accounts...");
    const accounts = await bunqService.getAccounts();
    
    if (accounts.length === 0) {
      console.log("No accounts found.");
      return;
    }

    const accountId = accounts[0].id;
    console.log(`Using Account ID: ${accountId} (${accounts[0].description})`);
    
    console.log("Fetching Draft Payments from bunq Sandbox...");
    const drafts = await bunqService.getDraftPayments(accountId);
    
    console.log(`\nFound ${drafts.length} Draft Payments!\n`);
    
    drafts.forEach(d => {
      const draft = d.DraftPayment;
      console.log(`-----------------------------------`);
      console.log(`ID: ${draft.id}`);
      console.log(`Status: ${draft.status}`);
      const entry = draft.entries[0];
      console.log(`Amount: ${entry.amount.value} ${entry.amount.currency}`);
      console.log(`Counterparty: ${entry.counterparty_alias.name} (${entry.counterparty_alias.value})`);
      console.log(`Description: ${entry.description}`);
    });
    console.log(`-----------------------------------`);

  } catch (error) {
    console.error("Error fetching drafts:", error.response?.data || error.message);
  }
}

checkDrafts();
