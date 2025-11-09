✅ README.md — Design SV Payment System (Ongoing Build)

A secure, frontend-driven payment interface with PIN authentication, Flutterwave integration & multi-step checkout.

Design SV Payment System

A modern, secure, multi-step payment platform developed using HTML, Tailwind CSS, and JavaScript, featuring PIN-based access control, mobile-first UI/UX, a security center, custom modals, and Flutterwave-powered transactions.

This project is currently in active development and will serve as the core checkout system for Design SV digital products and services.

🚀 Features (Completed & In Progress)
✅ 1. PIN Authentication System

Login with 4-digit secure PIN

Change PIN interface (modal-based)

Forgot PIN flow with recovery questions

Validation logic for secure reset

Local encrypted storage for session persistence

Error handling + UI alerts

Prevention against PIN brute-force attempts

✅ 2. Security Center

Add/Update recovery questions

Manage session timeout

View security logs

Enforce PIN reset when no recovery question is saved

Secure storage checks before allowing logout/login flows

✅ 3. Payment Checkout (Frontend)

Integration with Flutterwave Payment Gateway

Multi-step checkout:

Select product

Confirm details

Initiate payment

Thank-you animation screen

Dynamic price selection

Loading animations before payment launch

Support for both dark & light modes

✅ 4. Mobile Navigation + Responsive UI

Fully responsive navbar and mobile drawer

Fixed overlapping modal issue

Modular JS navigation controller

Smooth close/open animations

Prevents modal stacking

Activity center fixed to expand properly on mobile

✅ 5. Transactions & Activity Log

A dedicated section for previous payments

Auto-expanding activity cards

Scroll-enabled UI for mobile view

Fallback UI when no transactions exist

🛠️ Technology Stack
Layer	Tools
Frontend	HTML5, Tailwind CSS, JavaScript (ES6)
Payment Gateway	Flutterwave Inline API
Data Storage	LocalStorage (encrypted fields), Session memory
Security	Custom recovery module + PIN system
UX	Custom modals, responsive nav, animations
🔐 Security Features

This payment system prioritizes user safety and data protection:

Mandatory recovery question before PIN changes

Protected session logout

Failure lockout for incorrect PIN attempts

No PIN stored in plain text in localStorage

Double-layer validation for PIN reset

Secure modal flow (prevents stack collisions and bypasses)

📦 Project Structure
designsv-payment-system/
│── index.html
│── styles/
│   └── tailwind.css
│── js/
│   ├── app.js
│   ├── security.js
│   ├── pin-manager.js
│   ├── navigation.js
│   └── checkout.js
│── assets/
│   ├── icons/
│   └── animations/
└── LICENSE

📘 Usage Instructions
1. Start the App

Open index.html in any modern browser.
No server required — fully frontend powered.

2. First-Time Setup

Set a PIN

Create a recovery question

Access dashboard & proceed to checkout

3. Payment

Choose a product plan

Review summary

Process via Flutterwave

View confirmation page

Transaction stored in Activity Log

✅ Roadmap (Next Updates)
Feature	Status
Webhook backend for order confirmation	⏳ In Planning
PDF receipt generator	⏳ In Progress
Email confirmation system	⏳ In Progress
Admin dashboard for viewing payments	🚧 Upcoming
Full log encryption system	🚧 Upcoming
PIN retry timer & advanced security	✅ Testing
📜 License

This project uses a Dual License:

✅ MIT License — For Source Code

The code in this repository is provided under the MIT License, permitting open use, modification, and distribution.

❗ Design SV Proprietary License — For Brand & Assets

All Design SV logos, interfaces, animations, and UI/UX designs are All Rights Reserved and not open-source.

See LICENSE for full terms.

🧾 Author

Design SV
Creative Engineering • Frontend Solutions • Digital Products
For licensing, partnership, or enterprise integration, contact Design SV.
