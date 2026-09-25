# 💰 Money Management Mobile App

A modern, offline-first personal finance and expenditure tracking mobile application built with **React Native**, **Expo SDK 57**, **Expo Router**, and **TypeScript**.

---

## ✨ Features

- **📊 Dashboard & Net Worth Tracker:**
  - Real-time Total Net Worth across all your wallets & accounts (Cash, Bank Accounts, Credit Cards, Savings).
  - Monthly cash flow breakdown: Total Inflow vs Outflow, Net Savings, and Savings Rate percentage.
  - Privacy toggle to quickly blur/hide balance figures.

- **💸 Income & Expense Logging:**
  - Intuitive, fast transaction recording with instant keypad chips (+10, +25, +50, +100).
  - Categorization with vibrant custom icons (Food & Dining, Rent, Utilities, Transport, Shopping, Healthcare, Freelance, Salary, Investments).
  - Account selection (Cash Wallet, Checking Account, Credit Cards, Savings).

- **📈 Visual Analytics & Insights:**
  - **Spending Donut Chart:** Interactive SVG category breakdown with percentage legend.
  - **6-Month Cash Flow Bar Chart:** Side-by-side comparison of income vs expenses across time.
  - **Category Ranking:** Progress bar representation of top expenditure sources.
  - **Smart Insights:** Automated alerts identifying your largest cost center.

- **🎯 Monthly Budgets & Spending Limits:**
  - Category-based budget goals with real-time percentage gauges.
  - Multi-tier alert badges: **On Track** (Green), **Near Limit / 80%+** (Amber), and **Over Limit** (Rose/Red).
  - Remaining spend allowance calculator.

- **🔁 Subscriptions & Recurring Bills:**
  - Track upcoming rent, utilities, streaming services (Netflix, Spotify), and gym memberships.
  - Due date countdown badges (*"Due in 2 days"*, *"Due Today"*).
  - One-tap **"Pay"** button to instantly record the payment and update the cycle.

- **⚙️ Accounts & Settings:**
  - Multi-currency switcher with live symbol updates ($, Rs, €, £, ₹, A$, C$, ¥, S$, AED).
  - Fully offline, encrypted device storage using `@react-native-async-storage/async-storage`.
  - Demo data generator & reset controls for instant testing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ or v20+)
- Expo Go app on your physical iOS or Android phone (available on Apple App Store & Google Play Store)

### Running the App

1. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

2. **Run on your phone:**
   - Open **Expo Go** on Android and scan the QR code displayed in the terminal.
   - On iOS, open the **Camera** app and scan the QR code to open in Expo Go.

3. **Run on Web / Emulator (optional):**
   - Press `w` in the terminal to launch in your web browser.
   - Press `a` to open in Android Emulator.
   - Press `i` to open in iOS Simulator (macOS only).

---

## 🛠️ Tech Stack & Architecture

- **Framework:** Expo SDK 57 (React Native 0.86, React 19)
- **Routing:** Expo Router (`src/app/` file-based routing)
- **State & Storage:** React Context API + `@react-native-async-storage/async-storage`
- **Charts & Graphics:** `react-native-svg`
- **Icons:** `@expo/vector-icons` (Ionicons)
- **Theme:** OLED Dark Mode (`#0B0F19` base, `#131B2E` cards, WCAG compliant contrast)

---

## 📁 Project Structure

```text
src/
├── app/
│   ├── _layout.tsx              # Root Stack Navigator & Providers
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Bottom Tab Bar Navigator
│   │   ├── index.tsx            # Home Dashboard & Net Worth
│   │   ├── analytics.tsx        # Spending Charts & Cash Flow
│   │   ├── budgets.tsx          # Category Budgets & Limit Alerts
│   │   ├── recurring.tsx        # Subscriptions & Upcoming Bills
│   │   └── settings.tsx         # Accounts, Currencies & Storage
│   └── modal/
│       ├── transaction.tsx      # Add Expense / Income Modal
│       ├── budget.tsx           # Create Budget Goal Modal
│       └── recurring.tsx        # Add Scheduled Bill Modal
├── components/
│   ├── Card.tsx                 # Dark OLED Card Surface
│   ├── SpendingDonutChart.tsx   # SVG Donut Chart
│   ├── CashFlowBarChart.tsx     # SVG Monthly Bar Chart
│   ├── TransactionRow.tsx       # Memoized Transaction Item
│   ├── BudgetCard.tsx           # Category Budget & Alert Card
│   ├── BillReminderCard.tsx     # Bill Countdown Card
│   └── ProgressBar.tsx          # Dynamic Multi-tier Progress Bar
├── constants/
│   └── theme.ts                 # Colors, Spacing, Currencies & Categories
├── context/
│   └── FinancialContext.tsx     # Global State & Financial Metrics
├── services/
│   └── storage.ts               # Local Storage Persistence & Demo Data
└── types/
    └── index.ts                 # TypeScript Data Models
```
