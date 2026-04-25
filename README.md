# 🌈 bunqOrbit | Full-Duplex AI Voice Assistant for Business

*bunqOrbit* is an intelligent, multi-modal financial assistant designed for the bunq Hackathon 7.0. It transforms the banking experience from a static app into a proactive, "living" financial universe for freelancers and small businesses.

---

## 🚀 Vision
Banking shouldn't be about manual data entry. *bunqOrbit* uses State-of-the-Art AI to bridge the gap between financial data and human intuition. It sees your invoices, predicts your cash flow, and talks to you like a human CFO.

---

## ✨ Key Features

### 1. 🎤 Full-Duplex Voice Assistant (Audio)
*   *Barge-in Support:* Unlike traditional bots, you can interrupt bunqOrbit mid-sentence.
*   *Proactive Advice:* It doesn't just answer; it warns you about upcoming liabilities (like tax payments) and suggests moving money to savings sub-accounts.
*   *Hands-Free Banking:* Check balances and execute payments entirely by voice.

### 2. 👁️ Visual Audit (Image)
*   *Invoice Intelligence:* Drag and drop an invoice image, and bunqOrbit uses *Amazon Bedrock (Vision)* to extract amount, vendor, VAT, and category.
*   *Duplicate Detection:* AI compares the invoice with your bunq history to prevent paying the same bill twice.
*   *One-Tap Drafts:* Instantly creates a "Draft Payment" in bunq for you to approve.

### 3. 📈 Predictive Cash-Flow (Data Viz)
*   *Real-Time Forecasts:* Combines actual bunq transaction history with AI predictions.
*   *Runway Analysis:* Tells you exactly how many months of "runway" you have based on your real burn rate.
*   *Interactive Charts:* A liquid, modern UI that reacts to your voice commands in real-time.

---

## 🛠️ Tech Stack
*   *Frontend:* React 18, Vite, Tailwind CSS, Framer Motion, Recharts.
*   *Backend:* Node.js, Express.
*   *AI Engine:* Amazon Bedrock (Claude 3.5 Sonnet & Vision) via AWS SDK.
*   *Banking:* bunq Public API integration.

---

## 📦 Setup & Installation

### 1. Prerequisites
*   *Node.js*: v18.0 or higher.
*   *bunq Sandbox*: Access to the bunq Developer Portal to generate an API key.
*   *AWS Account: An active account with **Amazon Bedrock* access.

---

### 2. AWS Bedrock Configuration
To use the AI features (Vision & Voice), you need to configure your AWS environment:
1.  *Model Access: In the AWS Console, navigate to **Amazon Bedrock > Model Access* and ensure *Claude 3.5 Sonnet* (Anthropic) is enabled.
2.  *IAM User*: Create an IAM user with ⁠ AmazonBedrockFullAccess ⁠ permissions.
3.  *Credentials*: Generate an ⁠ Access Key ID ⁠ and ⁠ Secret Access Key ⁠. If you are using temporary credentials (AWS Academy/CLI), you will also need the ⁠ Session Token ⁠.

---

### 3. bunq API Configuration
1.  *Sandbox Key*: Go to the [bunq Developer Portal](https://developer.bunq.com/) and create a Sandbox API key.
2.  *Initial Run*: When the backend starts for the first time with a new API key, it will automatically register the device and create a ⁠ bunq_context.json ⁠ file.
3.  *Company Name*: Set ⁠ BUNQ_COMPANY_NAME ⁠ in your ⁠ .env ⁠ to match the name in your sandbox account for a personalized greeting.

---

### 4. Backend Setup (Node.js)
⁠ bash
cd bunq-orbit-backend
npm install
cp .env.example .env
 ⁠
*Edit your ⁠ .env ⁠ with your credentials:*
⁠ env
BUNQ_API_KEY=sandbox_...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0
 ⁠
*Start the server:*
⁠ bash
npm start
# 🚀 Server runs on http://localhost:3000
 ⁠

### 5. Frontend Setup (React)
⁠ bash
cd frontend
npm install
cp .env.example .env
npm run dev
# ✨ Access at http://localhost:5173
 ⁠

---

## 🏗️ Project Structure
⁠ text
├── bunq-orbit-backend/   # Node.js Server
│   ├── src/services/     # AI (Bedrock), bunq API, and deterministic math logic
│   ├── src/routes/       # Voice intent processing & dashboard API
│   └── uploads/          # Temporary storage for Visual Audit analysis
└── frontend/             # React (Vite) App
    ├── src/components/   # VoiceOrb (Siri-like UI), VisualAudit (Vision UI), Insights (Recharts)
    └── src/index.css     # Global bunq-rainbow branding and glassmorphism
 ⁠

---

Developed with ❤️ for the *bunq Hackathon 7.0*.
