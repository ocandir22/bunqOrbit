# 🌈 bunqOrbit | Full-Duplex AI Voice Assistant for Business

**bunqOrbit** is an intelligent, multi-modal financial assistant designed for the bunq Hackathon 7.0. It transforms the banking experience from a static app into a proactive, "living" financial universe for freelancers and small businesses.

---

## 🚀 Vision
Banking shouldn't be about manual data entry. **bunqOrbit** uses State-of-the-Art AI to bridge the gap between financial data and human intuition. It sees your invoices, predicts your cash flow, and talks to you like a human CFO.

---

## ✨ Key Features

### 1. 🎤 Full-Duplex Voice Assistant (Audio)
*   **Barge-in Support:** Unlike traditional bots, you can interrupt bunqOrbit mid-sentence.
*   **Proactive Advice:** It doesn't just answer; it warns you about upcoming liabilities (like tax payments) and suggests moving money to savings sub-accounts.
*   **Hands-Free Banking:** Check balances and execute payments entirely by voice.

### 2. 👁️ Visual Audit (Image)
*   **Invoice Intelligence:** Drag and drop an invoice image, and bunqOrbit uses **Amazon Bedrock (Vision)** to extract amount, vendor, VAT, and category.
*   **Duplicate Detection:** AI compares the invoice with your bunq history to prevent paying the same bill twice.
*   **One-Tap Drafts:** Instantly creates a "Draft Payment" in bunq for you to approve.

### 3. 📈 Predictive Cash-Flow (Data Viz)
*   **Real-Time Forecasts:** Combines actual bunq transaction history with AI predictions.
*   **Runway Analysis:** Tells you exactly how many months of "runway" you have based on your real burn rate.
*   **Interactive Charts:** A liquid, modern UI that reacts to your voice commands in real-time.

---

## 🛠️ Tech Stack
*   **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, Recharts.
*   **Backend:** Node.js, Express.
*   **AI Engine:** Amazon Bedrock (Claude 3.5 Sonnet & Vision) via AWS SDK.
*   **Banking:** bunq Public API integration.

---

## 📦 Setup & Installation

### 1. Backend Setup
```bash
cd bunq-orbit-backend
npm install
cp .env.example .env
# Fill in your credentials in .env
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## 🏗️ Project Structure
```text
├── bunq-orbit-backend/   # Express Server & AI Logic
│   ├── src/services/    # bunq, Bedrock & Insights logic
│   └── src/routes/      # Voice and Dashboard endpoints
└── frontend/             # React Application
    ├── src/components/   # VoiceOrb, VisualAudit, Insights
    └── src/index.css     # Bunq-Rainbow design system
```

---

Developed with ❤️ for the **bunq Hackathon 7.0**.
