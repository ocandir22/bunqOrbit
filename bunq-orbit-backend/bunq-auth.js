const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const BASE_URL = process.env.BUNQ_BASE_URL || 'https://public-api.sandbox.bunq.com/v1';
const API_KEY = process.env.BUNQ_API_KEY;
const PRIVATE_KEY_PATH = path.resolve(__dirname, process.env.BUNQ_PRIVATE_KEY_PATH || './installation.key');
const PUBLIC_KEY_PATH = path.resolve(__dirname, process.env.BUNQ_PUBLIC_KEY_PATH || './installation.pub');
const DEVICE_DESC = process.env.BUNQ_DEVICE_DESCRIPTION || 'bunq_orbit_company_dev';

function getBaseHeaders() {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'User-Agent': 'bunq-orbit/1.0',
    'X-Bunq-Client-Request-Id': crypto.randomUUID(),
    'X-Bunq-Language': 'en_US',
    'X-Bunq-Region': 'nl_NL',
    'X-Bunq-Geolocation': '0 0 0 0 000',
  };
}

function signRequest(bodyString, privateKeyPem) {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(bodyString);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

async function authenticate() {
  try {
    const publicKeyPem = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    console.log('Step 1: POST /installation');
    const installBody = JSON.stringify({ client_public_key: publicKeyPem });
    const installRes = await axios.post(`${BASE_URL}/installation`, installBody, {
      headers: getBaseHeaders()
    });

    let installationToken = null;
    let serverPublicKey = null;

    installRes.data.Response.forEach(item => {
      if (item.Token) installationToken = item.Token.token;
      if (item.ServerPublicKey) serverPublicKey = item.ServerPublicKey.server_public_key;
    });
    
    console.log('Installation Token received.');

    console.log('Step 2: POST /device-server');
    const deviceBody = JSON.stringify({
      description: DEVICE_DESC,
      secret: API_KEY,
      permitted_ips: ['*']
    });

    let deviceHeaders = getBaseHeaders();
    deviceHeaders['X-Bunq-Client-Authentication'] = installationToken;
    deviceHeaders['X-Bunq-Client-Signature'] = signRequest(deviceBody, privateKeyPem);

    await axios.post(`${BASE_URL}/device-server`, deviceBody, { headers: deviceHeaders });
    console.log('Device Registered.');

    console.log('Step 3: POST /session-server');
    const sessionBody = JSON.stringify({ secret: API_KEY });
    let sessionHeaders = getBaseHeaders();
    sessionHeaders['X-Bunq-Client-Authentication'] = installationToken;
    sessionHeaders['X-Bunq-Client-Signature'] = signRequest(sessionBody, privateKeyPem);

    const sessionRes = await axios.post(`${BASE_URL}/session-server`, sessionBody, { headers: sessionHeaders });
    
    let sessionToken = null;
    let userId = null;

    sessionRes.data.Response.forEach(item => {
      if (item.Token) sessionToken = item.Token.token;
      if (item.UserCompany) userId = item.UserCompany.id;
      if (item.UserPerson) userId = item.UserPerson.id;
      if (item.UserApiKey) userId = item.UserApiKey.id;
    });

    console.log('Session Created!');
    console.log('---------------------------');
    console.log('BUNQ_SESSION_TOKEN:', sessionToken);
    console.log('BUNQ_USER_ID:', userId);

    // Save tokens to .env for future use
    fs.appendFileSync(path.resolve(__dirname, '.env'), `\nBUNQ_SESSION_TOKEN=${sessionToken}\nBUNQ_AUTH_USER_ID=${userId}\nBUNQ_INSTALLATION_TOKEN=${installationToken}\n`);
    console.log('Tokens appended to .env file.');

  } catch (error) {
    console.error('Authentication Flow Failed:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

authenticate();
