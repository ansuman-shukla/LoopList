# 🔄 LoopList

<div align="center">
  <img src="frontend/public/logo.png" alt="LoopList Logo" width="200"/>
  <h3>Build Micro-Habits with Visual Progress</h3>
  <p>A social streak tracker for building micro-habits with visual progress and optional public accountability</p>
</div>

## 📋 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## 🌟 Overview

LoopList is a social habit tracking platform that helps users build micro-habits through visual progress tracking and optional social accountability. The core concept revolves around "not breaking the chain" - a proven psychological technique for habit formation.

With LoopList, users can:
- Create and track micro-habits (loops) with various frequency options
- Visualize progress through streak tracking
- Share progress publicly or with friends
- Discover and clone popular habits from the community
- React to and engage with others' habit journeys

## ✨ Features

### 🎯 Core Functionality
- **Customizable Loops**: Create habits with various frequency types (daily, weekly, custom)
- **Streak Tracking**: Automatic calculation of current and longest streaks
- **Visual Progress**: Calendar view showing completion history
- **Multiple Visibility Options**: Private, public, or friends-only sharing

### 🌐 Social Features
- **Public Loop Boards**: Discover popular habits from the community
- **Leaderboard**: See top users ranked by streak length
- **Reactions**: Support others with emoji reactions
- **Loop Cloning**: Copy interesting habits to your own dashboard
- **Friends System**: Connect with others and share progress selectively

### 👤 User Experience
- **Personalized Dashboard**: View and manage all your active loops
- **Completion Calendar**: Visual representation of your habit consistency
- **Status Indicators**: Clear visual cues for streak status (active, broken, completed)
- **Mobile-Friendly Design**: Track habits on any device

## 🛠️ Tech Stack

### Frontend
- **React**: UI library for building the user interface
- **React Router**: For navigation and routing
- **React Query**: For efficient data fetching and state management
- **Tailwind CSS**: For styling and responsive design
- **Vite**: Build tool and development server
- **JWT Decode**: For authentication token handling
- **React Calendar**: For the completion calendar visualization
- **React Icons**: For UI icons

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **MongoDB**: NoSQL database (with Motor for async operations)
- **Pydantic**: Data validation and settings management
- **JWT**: For authentication and authorization
- **Uvicorn**: ASGI server for running the application

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB

### Installation

#### Backend Setup
```bash
# Clone the repository
git clone https://github.com/ansuman-shukla/LoopList.git
cd looplist

# Set up Python virtual environment
cd backend
python -m venv venv
.\venv\Scripts\activate  # On Windows
source venv/bin/activate  # On Unix/MacOS

# Install dependencies
pip install -r requirements.txt

# Create .env file with necessary environment variables
# Example:
# MONGODB_URL=mongodb://localhost:27017
# SECRET_KEY=your_secret_key
# ACCESS_TOKEN_EXPIRE_MINUTES=60
```

#### Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install
```

### Running Locally

#### Start Backend Server
```bash
cd backend
.\venv\Scripts\activate  # On Windows
source venv/bin/activate  # On Unix/MacOS
python main.py
```

#### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The application should now be running at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📁 Project Structure

```
looplist/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core settings and config
│   │   ├── db/           # Database connections
│   │   ├── models/       # Pydantic models
│   │   ├── schemas/      # Request/response schemas
│   │   └── services/     # Business logic
│   ├── main.py           # Application entry point
│   └── requirements.txt  # Python dependencies
│
└── frontend/
    ├── public/           # Static assets
    ├── src/
    │   ├── components/   # React components
    │   ├── context/      # React context providers
    │   ├── hooks/        # Custom React hooks
    │   ├── pages/        # Page components
    │   ├── services/     # API service functions
    │   └── utils/        # Utility functions
    ├── index.html        # HTML entry point
    └── package.json      # Node.js dependencies
```

## 📚 API Documentation

When running locally, the API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

Key API endpoints include:
- Authentication: `/api/v1/auth/signup`, `/api/v1/auth/login`
- Loops: `/api/v1/loops`
- Completions: `/api/v1/loops/{loop_id}/complete`
- Public Loops: `/api/v1/public/loops`
- Leaderboard: `/api/v1/leaderboard`
- Friends: `/api/v1/users/me/friends`

## 🌐 Deployment

### Live Demo
- Frontend: 🍳 Under cooking 🍳
- Backend API: 🍳 Under cooking 🍳

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
