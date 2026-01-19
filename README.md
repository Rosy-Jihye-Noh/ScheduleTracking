# Schedule Tracking System

Multi-carrier vessel schedule inquiry and tracking system based on DCSA standards.

## Overview

This system provides a unified interface for querying vessel schedules and tracking cargo across multiple shipping carriers (CMA CGM, HMM, ZIM, Maersk). It abstracts carrier-specific APIs into a standardized DCSA-based domain model.

## Architecture

The project follows a layered architecture:

- **Domain Layer** (`src/domain/`): Core business models and logic
  - Models: DCSA-based domain models (Schedule, Tracking, Common)
  - Services: Business logic services

- **Adapter Layer** (`src/adapters/`): External API integration
  - Carriers: Carrier-specific adapters implementing the unified interface
  - HTTP: HTTP client and authentication management
  - Factory: Adapter factory for dynamic creation

- **Infrastructure Layer** (`src/infrastructure/`): Cross-cutting concerns
  - Cache: Caching strategies
  - Logger: Structured logging
  - Error: Error handling
  - Config: Configuration loading

- **API Layer** (`src/api/`): REST API endpoints
  - Routes: API route definitions
  - Controllers: Request/response handling
  - Middleware: Validation, error handling, carrier filtering
  - DTO: Data Transfer Objects

## Project Structure

```
ScheduleTracking/
├── src/
│   ├── domain/              # Domain layer
│   │   ├── models/          # Domain models (DCSA-based)
│   │   └── services/       # Business logic
│   ├── adapters/            # Adapter layer
│   │   ├── carriers/        # Carrier adapters
│   │   │   ├── base/        # Base interfaces
│   │   │   ├── cma-cgm/     # CMA CGM adapter
│   │   │   ├── hmm/         # HMM adapter
│   │   │   ├── zim/         # ZIM adapter
│   │   │   └── maersk/      # Maersk adapter
│   │   ├── http/            # HTTP client
│   │   └── factory/         # Adapter factory
│   ├── infrastructure/      # Infrastructure layer
│   ├── api/                 # API layer
│   └── utils/               # Utilities
├── config/                  # Configuration files
│   └── carriers/            # Carrier-specific configs
├── swagger/                 # Swagger/OpenAPI files
└── tests/                   # Tests
```

## Getting Started

### Prerequisites

- **Node.js 20.10.5+** (`.nvmrc` 파일 참고)
- **npm 10.0.0+** 또는 pnpm
- nvm (Node Version Manager) 권장 - 프로젝트별 Node.js 버전 관리

자세한 개발 환경 설정은 `DEVELOPMENT_SETUP.md`를 참고하세요.

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run production build
npm start
```

### Configuration

#### 1. 환경 변수 설정 (.env 파일)

**프로젝트 루트에 `.env` 파일을 생성**하고 다음 형식으로 작성하세요:

```env
# CMA CGM (API Key)
# Swagger에 따르면 OAuth2와 API Key 둘 다 지원하지만, API Key 하나만 받으셨다면:
CMCG_API_KEY=your_cma_cgm_api_key_here
# OAuth2를 사용하려면 (Private connection, 더 많은 기능):
# CMCG_CLIENT_ID=your_cma_cgm_client_id_here
# CMCG_CLIENT_SECRET=your_cma_cgm_client_secret_here

# HMM (API Key - 엔드포인트별로 다른 키 사용)
# Vessel Schedule API Key
HMM_API_KEY_SCHEDULE=your_hmm_schedule_api_key_here
# Track and Trace API Key
HMM_API_KEY_TRACKING=your_hmm_tracking_api_key_here
# Port Schedule API Key (선택사항)
HMM_API_KEY_PORT_SCHEDULE=your_hmm_port_schedule_api_key_here
# 기본 API Key (fallback, 선택사항)
HMM_API_KEY=your_hmm_api_key_here

# ZIM (API Key - Primary/Secondary Key 지원)
# 각 API별로 Primary Key와 Secondary Key를 받으셨다면:
# Vessel Schedule-Sandbox
ZIM_PRIMARY_KEY_SCHEDULE=your_zim_schedule_primary_key_here
ZIM_SECONDARY_KEY_SCHEDULE=your_zim_schedule_secondary_key_here
# Tracing-Sandbox
ZIM_PRIMARY_KEY_TRACKING=your_zim_tracking_primary_key_here
ZIM_SECONDARY_KEY_TRACKING=your_zim_tracking_secondary_key_here
# 또는 일반 API Key (fallback)
ZIM_API_KEY_SCHEDULE=your_zim_schedule_api_key_here
ZIM_API_KEY_TRACKING=your_zim_tracking_api_key_here
# 기본 API Key (fallback)
ZIM_API_KEY=your_zim_api_key_here

# Maersk (OAuth2 + Consumer Key)
# Consumer Key와 Secret Key를 받으셨다면:
MAERSK_CONSUMER_KEY=your_maersk_consumer_key_here
MAERSK_SECRET_KEY=your_maersk_secret_key_here
# 또는 (둘 다 지원):
# MAERSK_CLIENT_ID=your_maersk_consumer_key_here
# MAERSK_CLIENT_SECRET=your_maersk_secret_key_here

# Application Settings
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

**⚠️ 중요사항:**
- `.env` 파일은 **절대 Git에 커밋하지 마세요!** (이미 .gitignore에 포함됨)
- 환경 변수 이름은 **정확히 일치**해야 합니다 (대소문자 구분)
- Carrier Code: `CMCG`, `HMM`, `ZIM`, `MAERSK` (대문자)
- 각 선사 포털에서 발급받은 **실제 API Key/토큰**으로 교체하세요

#### 2. 선사별 API Key 발급 방법

- **CMA CGM**: [API Portal](https://api-portal.cma-cgm.com/) - OAuth2 Client Credentials
- **HMM**: HMM API Gateway 포털 - API Key
- **ZIM**: ZIM API 포털 - API Key  
- **Maersk**: [Developer Portal](https://developer.maersk.com/) - OAuth2 + API Key

자세한 내용은 `NEXT_STEPS.md` 파일을 참고하세요.

## Carrier Support

| Carrier | Schedule API | Tracking API | Standard |
|---------|-------------|--------------|----------|
| CMA CGM | ✅ DCSA | ✅ DCSA | Full DCSA |
| HMM | ⚠️ Proprietary | ⚠️ DCSA-based | Mapper required |
| ZIM | ⚠️ Proprietary | ✅ DCSA | Mapper required for Schedule |
| Maersk | ✅ DCSA | ✅ DCSA | Full DCSA |

## Development

### Adding a New Carrier

1. Create carrier config: `config/carriers/[carrier-name].json`
2. Create adapter directory: `src/adapters/carriers/[carrier-name]/`
3. Implement `CarrierAdapter` interface
4. Add mappers if needed (for non-DCSA APIs)

See `COMPLETE_GUIDE.md` for detailed instructions.

## License

MIT

