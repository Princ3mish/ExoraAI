# Exora AI

## Description
Exora AI is a comprehensive full-stack application. This repository contains the source code for both the frontend client and the backend server. The project is designed with a modular architecture to ensure scalability, maintainability, and high performance.

## Project Structure
- `/frontend` - Contains the user interface and client-side application logic.
- `/backend` - Contains the server, API, and database interaction logic.

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Branching Strategy
- `main` - Production-ready code.
- `dev` - Active development branch.
- `feature/*` - Feature branches for development.

## Phases Completed

### Phase 2: Database & Core Architecture
- **Prisma Data Model**: Designed and applied models for `User`, `Meeting`, `Participant` (explicit composite join), and `Availability` using PostgreSQL.
- **Modular API Architecture**: Scaffolded feature-based routes (`/api/auth`, `/api/users`, `/api/meetings`, `/api/participants`) with separated `routes.js`, `controller.js`, and `service.js` layers.
- **Winston Structured Logging**: Implemented a global robust `logger` outputting requested JSON metadata.
- **Global Error Handling**: Built a centralized Express error wrapper masking 500 stack traces from the client while catching API faults cleanly.
