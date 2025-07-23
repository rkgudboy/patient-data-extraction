# Backend API

Node.js backend server for patient data extraction system.

## Setup

```bash
npm install
npm start
```

## Environment

Create `.env` file:
```
NODE_ENV=development
PORT=3000
DB_CONNECTION_STRING=your_database_url
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/extract` - Analyze extraction
- `POST /api/patients` - Save patient data
- `GET /api/patients` - Get all patients
- `POST /api/matches` - Find duplicate matches

## Database

Configure your database connection in the `.env` file. Supports PostgreSQL/MySQL.

## Running

- Development: `npm start`
- Production: `NODE_ENV=production npm start`

Server runs on http://localhost:3000