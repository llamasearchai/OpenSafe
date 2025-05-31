# OpenSafe

**Private Enterprise AI Safety Platform** - A robust, production-ready AI and API safety/security platform built with **TypeScript** and **Rust**.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## Enterprise Features

- **AI Safety Analysis**: Advanced content moderation and safety analysis
- **Constitutional AI**: Implement constitutional AI principles for ethical AI behavior
- **Policy Management**: Create and manage custom safety policies
- **Real-time Monitoring**: WebSocket-based real-time safety monitoring
- **OpenAI Integration**: Seamless integration with OpenAI APIs
- **User Management**: Complete user authentication and authorization
- **Research Tools**: Advanced research and analysis capabilities
- **Production Ready**: Docker containerization, monitoring, and logging
- **Enterprise Security**: Multi-layer security with audit logging

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (for production)
- Redis (for caching)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/llamasearchai/OpenSafe.git
cd OpenSafe
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

5. Run tests:
```bash
npm test
```

### Development

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:8080`

### Production Deployment

Using Docker Compose:
```bash
docker-compose up -d
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user

### Safety Analysis
- `POST /api/v1/safety/analyze` - Analyze content for safety
- `GET /api/v1/safety/history` - Get analysis history

### Policy Management
- `GET /api/v1/policies` - List policies
- `POST /api/v1/policies` - Create policy
- `PUT /api/v1/policies/:id` - Update policy
- `DELETE /api/v1/policies/:id` - Delete policy

### Chat Completions
- `POST /api/v1/chat/completions` - Safe chat completions

### Research
- `POST /api/v1/research/analyze` - Research analysis
- `GET /api/v1/research/reports` - Get research reports

## Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/opensafe

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# JWT
JWT_SECRET=your_jwt_secret

# Monitoring
ENABLE_METRICS=true
PROMETHEUS_PORT=9090
```

## Architecture

OpenSafe is built with a modular architecture:

- **API Layer**: Express.js REST API with TypeScript
- **Safety Engine**: Rust-based high-performance safety analysis
- **Database**: PostgreSQL for persistent data
- **Cache**: Redis for session management and caching
- **Monitoring**: Prometheus metrics and health checks
- **WebSocket**: Real-time communication for live monitoring

## Testing

Run the test suite:
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests
npm run test:all

# Load testing
npm run test:load
```

## Security

OpenSafe implements multiple security layers:

- JWT-based authentication
- Rate limiting
- Input validation with Zod schemas
- SQL injection prevention
- XSS protection
- CORS configuration
- Helmet.js security headers
- Enterprise audit logging

## Monitoring

Built-in monitoring includes:

- Health check endpoints
- Prometheus metrics
- Request/response logging
- Error tracking
- Performance monitoring

## Enterprise Support

For enterprise licensing, custom integrations, and professional support:

- **Repository**: Private enterprise repository
- **Support**: Enterprise-grade support available
- **Security**: SOC 2 Type II compliant architecture
- **Compliance**: GDPR, HIPAA, and industry standard compliance ready

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contact

For enterprise inquiries and support:
- **Repository**: https://github.com/llamasearchai/OpenSafe (Private)
- **Email**: enterprise@opensafe.ai
- **Documentation**: Internal enterprise documentation available

## Technical Specifications

- **Language Classification**: TypeScript (65%), Rust (30%), JavaScript (5%)
- **Production Ready**: Enterprise-grade deployment
- **Performance**: High-throughput concurrent processing
- **Scalability**: Horizontal scaling with Docker Swarm/Kubernetes
- **Reliability**: 99.9% uptime SLA architecture

## Roadmap

- [ ] Advanced ML model integration
- [ ] Multi-language support
- [ ] Enhanced policy templates
- [ ] Advanced analytics dashboard
- [ ] Enterprise SSO integration
- [ ] Advanced threat detection 