# Loan Predictor Service-Oriented Architecture

This project uses a Service-Oriented Architecture (SOA) composed of three main services:

1.  **Frontend**: A React application (hosted via Nginx).
2.  **Backend**: A Node.js Express server handling business logic and database interactions.
3.  **ML Service**: A Python Flask application serving the Machine Learning model.

## Architecture Diagram

[Frontend] -> (HTTP) -> [Backend] -> (HTTP) -> [ML Service]
                            |
                         (TCP)
                            v
                        [MongoDB]

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Running with Docker Compose

To start all services:

```bash
docker-compose up --build
```

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:5000
- **ML Service**: http://localhost:5001 (internal, but exposed)
- **MongoDB**: localhost:27017

### Development

To run locally without Docker:

**Frontend**:
```bash
cd frontend
pnpm install
pnpm dev
```

**Backend**:
```bash
cd backend
pnpm install
npm run dev
# Needs MongoDB running locally
# Needs ML Service running locally on port 5001
```

**ML Service**:
```bash
cd ml_service
pip install -r requirements.txt
python app.py
```
