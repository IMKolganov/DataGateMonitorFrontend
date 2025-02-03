# OpenVPN Gate Monitor

🔥 **OpenVPN Gate Monitor** is a web application for monitoring VPN connections, built with **ASP.NET Core** (backend) and **React** (frontend).

---

## 🚀 Quick Start

### 📌 1. Clone the Repository
```sh
git clone https://github.com/yourusername/OpenVPNGateMonitor.git
cd OpenVPNGateMonitor
```

---

## 🛠️ 2. Run the Backend (ASP.NET Core)

### 📌 **Install Dependencies**
```sh
cd backend
dotnet restore
```

### 📌 **Run the API**
```sh
dotnet run
```
By default, the server will be available at:
📡 `http://localhost:5580`

---

## 🎨 3. Run the Frontend (React)

### 📌 **Install Dependencies**
```sh
cd frontend
npm install
```

### 📌 **Start React Application**
```sh
npm start
```
📌 Open `http://localhost:3000/` in your browser.

---

## 🔧 Configuration

The backend uses **`appsettings.json`** for API configuration:

```json
{
  "AllowedHosts": "*",
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Information"
    }
  }
}
```

For frontend configuration, create a `.env` file in the `frontend` directory:

```sh
REACT_APP_API_URL=http://localhost:5580
```

---

## 🏗️ Project Structure
```
OpenVPNGateMonitor/
├── backend/        # ASP.NET Core Backend
│   ├── Controllers/ # API Controllers
│   ├── Models/      # Data Models
│   ├── Services/    # Business Logic
│   ├── appsettings.json  # Configuration File
│   ├── Program.cs   # Main Entry Point
│   └── Startup.cs   # App Configuration
│
├── frontend/       # React Frontend
│   ├── src/
│   │   ├── components/  # Reusable UI Components
│   │   ├── pages/       # Page-Level Components
│   │   ├── App.tsx      # Main React App
│   │   ├── index.tsx    # React Entry Point
│   └── package.json     # Frontend Dependencies
│
└── README.md       # Documentation
```

---

## 📜 License

This project is licensed under the **MIT License**.

---

## 👨‍💻 Author

- **Kolganov Ivan** — [GitHub](https://github.com/imkolganov)
