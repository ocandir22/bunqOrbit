# bunqOrbit | Hackathon Submission Details

## 1. Project Name
**bunqOrbit**

## 2. Project Description
**bunqOrbit** is an intelligent, multi-modal financial assistant designed to transform the banking experience from a static app into a proactive, "living" financial universe. It is specifically tailored for freelancers and small business owners who struggle with bookkeeping friction and cash-flow anxiety.

### The Problem
*   **Bookkeeping Friction:** Manual data entry for invoices and receipts is time-consuming and error-prone.
*   **Cash-Flow Anxiety:** Static banking dashboards show the past, but don't help users navigate future liabilities (like quarterly taxes).

### Our Solution
A "Living CFO" interface that moves banking from a reactive "check-and-click" model to a proactive "see-and-talk" model. It automates bookkeeping via vision and provides financial foresight via voice.

### How AI is Used (Essential Component)
AI is the fundamental engine of bunqOrbit, not just a feature:
*   **Intent Extraction:** Uses **Amazon Bedrock (Claude 3.5 Sonnet)** for full-duplex conversational logic, allowing real-time barge-in and context-aware banking.
*   **Predictive Analysis:** Performs deterministic balance history calculations and uses AI to predict the next 3 months of cash flow based on real bunq transaction trends.
*   **Visual Intelligence:** Employs **Bedrock Vision** to analyze invoices for VAT extraction, categorization, and cross-referencing against historical data to detect duplicate payment risks.

### Non-Text Modality Integration
We integrated two high-impact modalities to ensure a zero-friction user experience:
1.  **IMAGE (Visual Audit):** Users can upload invoice images. The AI "sees" the document, extracts all relevant banking data, and prepares a draft payment instantly.
2.  **AUDIO (Voice Assistant):** A full-duplex voice layer allows users to interact with their bank hands-free. It supports interruptions (barge-in), making it feel like talking to a real financial advisor.

---

## 3. GitHub Repository
The repository includes a comprehensive `README.md` with detailed setup instructions for both Backend (Node.js) and Frontend (React).

**Repository Structure:**
*   `/bunq-orbit-backend`: AI logic, bunq API integration, and insight services.
*   `/frontend`: Modern, Bunq-Rainbow themed interactive dashboard.
