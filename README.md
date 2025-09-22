## Sample DevOps App

A simple, realistic web application used to train junior DevOps engineers on CI/CD pipelines. It includes a Node.js/Express backend, static HTML/CSS/JS frontend, Jest tests, and a Dockerfile ready for production builds.

### Features
- **REST API**: `/health`, `/api/data`, `/api/info`, `/api/contact` (POST), `/metrics`
- **Static frontend**: `index.html`, `about.html`, `contact.html`
- **Security**: Helmet, rate limiting, input validation
- **Observability**: Health and metrics endpoints, structured logging (pino)
- **DX**: ESLint, Jest, Supertest, npm scripts
- **Docker**: Multi-stage image, non-root user, healthcheck

### Requirements
- Node.js 18+
- npm 9+

### Setup
```bash
npm ci
cp .env.example .env
npm run dev
```
Visit `http://localhost:3000`.

### Scripts
- `npm run dev`: Start in development with nodemon
- `npm start`: Start server
- `npm test`: Run tests
- `npm run test:coverage`: Run tests with coverage (80% target)
- `npm run lint`: Lint code

### API Endpoints
- `GET /health`: `{ status, timestamp, uptime }`
- `GET /api/data`: Full application data from `data/app-data.json`
- `GET /api/info`: App info + stats (no items)
- `POST /api/contact`: `{ name, email, message }` -> logs to `logs/contact.log`
- `GET /metrics`: `{ requestCount, errorCount, memory, uptime }`

### Environment Variables
See `.env.example`. Common:
- `PORT`: default 3000
- `LOG_LEVEL`: debug, info, warn, error
- `ENABLE_CORS`: enable CORS for `/api`
- `RATE_LIMIT_*`: API rate limiting
- `DATA_FILE_PATH`: path to JSON data
- `CONTACT_LOG_PATH`: file for contact submissions

### Docker
```bash
docker build -t sample-devops-app .
docker run -p 3000:3000 --env-file .env sample-devops-app
```

### Testing
```bash
npm test
npm run test:coverage
```

### Notes for DevOps Trainees
- Add this repo to your CI to run lint, tests, and build the Docker image.
- Use the health/metrics endpoints for liveness/readiness and monitoring.
- Consider adding caching headers, minification, and a reverse proxy in production.


