const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = process.env.BUNQ_BASE_URL || 'https://public-api.sandbox.bunq.com/v1';
const SESSION_TOKEN = process.env.BUNQ_SESSION_TOKEN;
const USER_ID = process.env.BUNQ_AUTH_USER_ID;
const PRIVATE_KEY_PATH = path.resolve(process.cwd(), process.env.BUNQ_PRIVATE_KEY_PATH || './installation.key');

let privateKeyPem = null;
try {
  privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
} catch (e) {
  console.warn("Could not load private key for signing requests.");
}

function getBaseHeaders(bodyString) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'User-Agent': 'bunq-orbit/1.0',
    'X-Bunq-Client-Authentication': SESSION_TOKEN,
    'X-Bunq-Client-Request-Id': crypto.randomUUID(),
    'X-Bunq-Language': 'en_US',
    'X-Bunq-Region': 'nl_NL',
    'X-Bunq-Geolocation': '0 0 0 0 000',
  };

  if (bodyString && privateKeyPem) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(bodyString);
    sign.end();
    headers['X-Bunq-Client-Signature'] = sign.sign(privateKeyPem, 'base64');
  }

  return headers;
}

async function getAccounts() {
  const url = `${BASE_URL}/user/${USER_ID}/monetary-account`;
  const response = await axios.get(url, { headers: getBaseHeaders() });
  
  // Flatten bunq response
  const accounts = response.data.Response.map(item => {
    const acc = item.MonetaryAccountBank || item.MonetaryAccountJoint || item.MonetaryAccountSavings || {};
    return {
      id: acc.id,
      description: acc.description,
      balance: acc.balance,
      status: acc.status
    };
  }).filter(a => a.id);

  return accounts;
}

async function getPayments(accountId) {
  const url = `${BASE_URL}/user/${USER_ID}/monetary-account/${accountId}/payment`;
  const response = await axios.get(url, { headers: getBaseHeaders() });

  const payments = response.data.Response.map(item => {
    const p = item.Payment;
    if (!p) return null;
    const alias = p.counterparty_alias || {};
    return {
      id: p.id,
      amount: p.amount,
      description: p.description,
      created: p.created,
      counterparty: alias.display_name || alias.name || alias.label_user?.display_name || alias.value || 'Unknown'
    };
  }).filter(Boolean);

  return payments;
}

async function createDraftPayment(accountId, entries, numberOfRequiredAccepts = 1) {
  const url = `${BASE_URL}/user/${USER_ID}/monetary-account/${accountId}/draft-payment`;
  const payload = {
    entries: entries,
    number_of_required_accepts: numberOfRequiredAccepts
  };
  const bodyString = JSON.stringify(payload);
  
  const response = await axios.post(url, bodyString, { headers: getBaseHeaders(bodyString) });
  return response.data.Response;
}

async function seedDemoData(accountId) {
  // 1. Request funds from Sugar Daddy
  const reqUrl = `${BASE_URL}/user/${USER_ID}/monetary-account/${accountId}/request-inquiry`;
  const reqBody = JSON.stringify({
    amount_inquired: { value: "500.00", currency: "EUR" },
    counterparty_alias: { type: "EMAIL", value: "sugardaddy@bunq.com", name: "Sugar Daddy" },
    description: "Hackathon test funds",
    allow_bunqme: false
  });
  await axios.post(reqUrl, reqBody, { headers: getBaseHeaders(reqBody) });

  // 2. Wait a bit for funds to settle
  await new Promise(r => setTimeout(r, 2000));

  // 3. Make an outgoing payment to create transaction history
  const payUrl = `${BASE_URL}/user/${USER_ID}/monetary-account/${accountId}/payment`;
  const payBody = JSON.stringify({
    amount: { value: "50.00", currency: "EUR" },
    counterparty_alias: { type: "EMAIL", value: "sugardaddy@bunq.com", name: "Sugar Daddy" },
    description: "Software subscription"
  });
  await axios.post(payUrl, payBody, { headers: getBaseHeaders(payBody) });
  
  return { success: true };
}

async function getDraftPayments(accountId) {
  const url = `${BASE_URL}/user/${USER_ID}/monetary-account/${accountId}/draft-payment`;
  const response = await axios.get(url, { headers: getBaseHeaders() });
  return response.data.Response;
}

module.exports = {
  getAccounts,
  getPayments,
  createDraftPayment,
  getDraftPayments,
  seedDemoData,
  getBaseHeaders,
  getUserId: () => USER_ID
};
