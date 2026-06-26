# AgriGuard Punjab - Hybrid Crop Disease Detection System

AgriGuard Punjab is a responsive, highly performant web application designed to support farmers and administrators across Punjab, Pakistan. It facilitates user role selection, secure farmer and admin registrations (linked to MongoDB Atlas), and provides a premium user interface with full bilingual support (English and Urdu) and dynamic RTL layout switching.

---

## 🌟 Key Features

* **Premium UI/UX Design**: Stunning interface featuring modern glassmorphism, smooth micro-animations, tailored green-accented gradients, and interactive hover states.
* **Bilingual Support (English / Urdu)**: A fully localized language toggle. Clicking the language button instantaneously updates all page content and swaps layout direction (`ltr` vs `rtl`) for natural Urdu reading.
* **Dual Role Workflow**:
  * **Farmer Registration**: Tailored to farmers, offering inputs for phone verification, and localized location dropdowns (Punjab Province, Districts like Multan, Lahore, Faisalabad, etc.), and farm size.
  * **Admin Registration**: Tailored to government officials or system operators, requiring official government email suffixes (`@agriguard.gov.pk` or `.gov`) and verification access codes.
* **Robust Client-Side Validation**: Immediate, visual feedback on invalid emails, weak passwords, unmatched password confirmations, and improper phone number lengths.
* **Node.js & Express Backend API**: A modular backend that handles user registration, password hashing (`bcryptjs`), and session token generation (`jsonwebtoken`).
* **MongoDB Atlas Integration**: Pre-configured database connection with Mongoose schemas and strict sparse unique index handling.
* **Zero-Setup Mock DB Fallback**: Automatic detection of database configurations. If no MongoDB Atlas URI is present in `.env`, the server automatically operates in a developer-friendly **Mock DB Mode**, logging payload structures locally.

---

## 📂 Project Architecture

```
Plant Detection Web/
├── .agents/                    # Workspace agent configurations (git ignored)
├── public/                     # Static assets (favicons, system icons)
├── requirements/               # Original screen mocks & documentation
├── server/                     # Express Backend Application
│   ├── config/                 # Database configuration (Mongoose setup)
│   ├── controllers/            # Controller logic (auth, users, notifications)
│   ├── middleware/             # Express middlewares (JWT authentication)
│   ├── models/                 # Mongoose schemas (User, FarmerProfile, AdminProfile)
│   ├── routes/                 # Express API endpoints
│   └── server.js               # Server entry point & Mock Mode interceptors
├── src/                        # React + Vite Frontend Application
│   ├── api/                    # Axios API client config & event buses
│   ├── assets/                 # Local images & asset files
│   ├── components/             # Reusable UI components (Headers, Sidebars, ProtectedRoutes)
│   ├── context/                # Context Providers (Auth, Language, Toast notifications)
│   ├── data/                   # Location datasets (Punjab districts)
│   ├── i18n/                   # Translation dictionaries (English & Urdu)
│   ├── pages/                  # Page layouts (Login, Registration, Verification, Reset)
│   └── main.jsx                # React mount entry
├── vite.config.js              # Vite configuration (proxying backend /api requests)
└── package.json                # Project script registry
```

---

## ⚡ Tech Stack

* **Frontend**: React 18, Vite, Vanilla CSS (Premium glassmorphism and variables).
* **Backend**: Node.js, Express, Mongoose.
* **Database**: MongoDB Atlas (Cloud Cluster).
* **Security**: `bcryptjs` for encryption, `jsonwebtoken` for stateless authentication.
* **Developer Tooling**: `concurrently` for running frontend and backend simultaneously, `nodemon` for server auto-reload.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v16+) and `npm` installed.

### Installation

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/anasazeem69/agriguard_punjab.git
   cd agriguard_punjab
   ```

2. Install dependencies for the frontend (root directory):
   ```bash
   npm install
   ```

3. Install dependencies for the backend (`server` directory):
   ```bash
   cd server
   npm install
   cd ..
   ```

### Configuration

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@your-cluster.mongodb.net/agriguard
JWT_SECRET=your_jwt_secret_key_here
```

> 💡 **Developer Hint**: If `MONGO_URI` is omitted or left empty, the server automatically starts in **Mock Database Mode** so you can test registrations immediately without connecting to an active database.

### Running the App

To run both the backend server and the frontend client simultaneously with a single command:

```bash
npm run dev
```

* Frontend will open at: `http://localhost:5173`
* Backend API will listen on: `http://localhost:5000`

---

## ⚙️ API Reference

### User Authentication

* **POST** `/api/auth/register/farmer`: Creates a new Farmer account and profile.
* **POST** `/api/auth/register/admin`: Creates a new Admin account and profile.
* **POST** `/api/auth/login`: Authenticates a user and returns a JSON Web Token (JWT).
