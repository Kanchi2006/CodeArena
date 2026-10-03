# CodeArena - Online Coding Practice and Skill Assessment Platform

A responsive, high-fidelity full-stack web application designed for coding practice, challenge assessment, and performance tracking. Built using a modern **React (Vite) frontend** and a lightweight **Node.js/Express + MySQL backend**.

## 🚀 Live Demo

👉 **[Open CodeArena](https://codearena-p5v2.onrender.com)**

Test the deployed application and explore the available coding, assessment, contest, course and certificate features.
---

## Technical Stack
* **Frontend**: React (Vite) + Vanilla CSS (Custom Glassmorphism Design System)
* **Backend**: Node.js + Express
* **Database**: MySQL (`mysql2` connection pool)
* **Runtimes & Tooling**: Node.js v24+, npm 11+

---

## Project Structure
```
code-arena/
├── backend/
│   ├── .env            # Environment configuration (ports, database credentials)
│   ├── db.js           # MySQL connection pool and auto-schema installer
│   ├── schema.sql      # MySQL schema table creation & sample problems seeder
│   ├── server.js       # Express routing, JWT auth, submission grader simulator
│   └── package.json    # Backend dependencies
└── frontend/
    ├── index.html      # Loads custom Google Fonts (Inter, Outfit, Fira Code)
    ├── vite.config.js  # Vite configurations and server proxy config (/api -> port 5000)
    ├── package.json    # Frontend dependencies (Lucide icons, React)
    └── src/
        ├── App.jsx     # Main React routes, views, states, and Monaco editor mockup
        ├── index.css   # Custom global styling rules, HSL themes, scrollbars
        └── main.jsx    # Client side React root initialization
```

---

## Database Setup & Config

By default, the backend service features an **Automated Schema Installer**. When the server starts up, it automatically:
1. Connectes to your MySQL engine.
2. Creates the database `codearena_db` if it doesn't exist.
3. Loads and installs the tables inside `schema.sql` (if missing).
4. Seeds default problems (Two Sum, Palindrome Number, Reverse String, etc.).
5. Seeds default demo credentials for user and admin login.

### Update credentials in `.env`:
Open [backend/.env](file:///d:/Projects/code-arena/backend/.env) and set your local MySQL server details:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_root_password   <-- CHANGE THIS
DB_NAME=codearena_db
JWT_SECRET=super_secret_codearena_jwt_key_12345
```

---

## How to Run the Project Live

### Step 1: Start the Backend API Server
1. Open a terminal in the `backend` folder.
2. Start the Express server:
   ```bash
   node server.js
   ```
   *Expected output:*
   ```
   Successfully connected to MySQL database engine.
   Verified/Created database "codearena_db".
   Verified database tables already exist.
   CodeArena backend service running on http://localhost:5000
   ```

### Step 2: Start the Frontend React Web App
1. Open a second, separate terminal in the `frontend` folder.
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open the URL printed in the terminal (usually `http://localhost:5173`) in your web browser.

---

## Live Demonstration Guide (Mentor Review)

1. **Quick-Demo Sign-In**:
   * On the login page, you will see a section titled **"Project Live Demo Quick Login"**.
   * Click **User Demo** to instantly log in as `user` (pre-seeded in DB).
   * Click **Admin Demo** to instantly log in as `admin` (pre-seeded with administrative privileges).
   
2. **Explore Dashboard**:
   * Review solved counters, daily streak numbers, and total XP.
   * View the interactive recent submission feed synchronizing directly from the MySQL database.
   
3. **Monaco-style Code Arena Workspace**:
   * Click **Code Arena** on the sidebar or navigate to **Problem Bank** and click **Solve** on *Two Sum*.
   * Select your preferred programming language from the dropdown menu (JavaScript, Python, C++, Java). The workspace will automatically load a boilerplate code template.
   * Modify the solution or keep it as is.
   * Click **Run Code** to run tests in the compilation console output.
   * Click **Submit Solution** to submit. If successful, you will receive an animated **"Accepted"** modal. Your solved stats, XP (+100 XP), and daily streak will dynamically increase in the MySQL database and update on the dashboard!

4. **Dynamic Leaderboard**:
   * Visit the **Leaderboard** to see users sorted by XP and solved counts. 

5. **Administrative Console (Admin View)**:
   * Log in using the **Admin Demo** button.
   * Open the **Admin Panel** link on the sidebar.
   * You can **seed new problems** by completing the form. Once submitted, they appear instantly inside the **Problem Bank** for all users.
   * You can review and manage the user database directly from the table.
