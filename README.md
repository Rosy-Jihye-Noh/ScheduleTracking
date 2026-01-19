# 🚢 Schedule Tracking System

DCSA 표준 기반 멀티 선사 선박 스케줄 조회 및 화물 트래킹 통합 시스템

## 📋 개요

여러 해운 선사(CMA CGM, HMM, ZIM, Maersk)의 API를 통합하여 표준화된 인터페이스로 선박 스케줄 및 화물 추적 정보를 제공합니다.

### 주요 기능
- 🗓️ **스케줄 조회**: 선박 운항 스케줄, 포트 스케줄, P2P 라우팅
- 📦 **화물 추적**: 컨테이너/B/L 기반 실시간 트래킹
- 🔄 **데이터 표준화**: 선사별 API → DCSA 표준 모델 자동 변환

---

## 🏗️ 프로젝트 구조

```
ScheduleTracking/
├── src/
│   ├── domain/                    # 도메인 레이어
│   │   └── models/
│   │       ├── schedule.ts        # 스케줄 모델 (DCSA 기반)
│   │       ├── tracking.ts        # 트래킹 모델 (DCSA 기반)
│   │       └── common.ts          # 공통 모델 (Vessel, Location)
│   │
│   ├── adapters/                  # 어댑터 레이어 (외부 API 연동)
│   │   ├── carriers/              # 선사별 어댑터
│   │   │   ├── base/              # 기본 인터페이스
│   │   │   ├── cma-cgm/           # CMA CGM 어댑터
│   │   │   ├── hmm/               # HMM 어댑터 + Mapper
│   │   │   ├── zim/               # ZIM 어댑터 + Mapper
│   │   │   └── maersk/            # Maersk 어댑터
│   │   ├── http/                  # HTTP 클라이언트, 인증 관리
│   │   └── factory/               # 어댑터 팩토리
│   │
│   ├── api/                       # API 레이어 (REST)
│   │   ├── routes/                # 라우트 정의
│   │   ├── controllers/           # 컨트롤러
│   │   └── middleware/            # 검증, 에러 처리
│   │
│   ├── infrastructure/            # 인프라 레이어
│   │   ├── config/                # 설정 로더
│   │   └── logger/                # 로깅 (Winston)
│   │
│   └── index.ts                   # 앱 진입점
│
├── config/carriers/               # 선사별 설정 (JSON)
├── CMACGM/                        # CMA CGM Swagger 스펙
├── HMM/                           # HMM Swagger 스펙
├── MAERSK/                        # Maersk Swagger 스펙
└── ZIM/                           # ZIM Swagger 스펙
```

---

## 🛠️ 기술 스택

- **Runtime**: Node.js 20.10.5+
- **Language**: TypeScript
- **Framework**: Express.js
- **HTTP Client**: Axios
- **Logging**: Winston
- **Standard**: DCSA (Digital Container Shipping Association)

---

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 참고하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

각 선사 API Key를 입력:

```env
# CMA CGM
CMCG_API_KEY=your_cma_cgm_api_key

# HMM (엔드포인트별 키)
HMM_API_KEY_SCHEDULE=your_hmm_schedule_key
HMM_API_KEY_TRACKING=your_hmm_tracking_key

# ZIM
ZIM_PRIMARY_KEY_SCHEDULE=your_zim_schedule_key
ZIM_PRIMARY_KEY_TRACKING=your_zim_tracking_key

# Maersk
MAERSK_CONSUMER_KEY=your_maersk_consumer_key
MAERSK_SECRET_KEY=your_maersk_secret_key

# App Settings
NODE_ENV=development
PORT=3000
```

### 3. 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

### 4. 테스트

```bash
# Health Check
curl http://localhost:3000/health
```

---

## 📡 API 사용법

### Schedule API

```bash
# 전체 선사 스케줄 조회
GET /api/v1/schedules?carrier=all

# 특정 선사 스케줄 조회
GET /api/v1/schedules?carrier=cma-cgm&vesselIMONumber=9321483

# P2P 라우팅 (CMA CGM)
GET /api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM
```

**주요 파라미터**:
| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `carrier` | 선사 코드 | `cma-cgm`, `hmm`, `zim`, `maersk`, `all` |
| `vesselIMONumber` | 선박 IMO 번호 | `9321483` |
| `carrierServiceCode` | 서비스 코드 | `FAL7` |
| `startDate` / `endDate` | 조회 기간 | `2025-01-01` |

### Tracking API

```bash
# 컨테이너 번호로 추적
GET /api/v1/tracking?carrier=all&equipmentReference=APZU4812090

# B/L 번호로 추적
GET /api/v1/tracking?carrier=cma-cgm&transportDocumentReference=SEL1988565

# Booking 번호로 추적 (HMM)
GET /api/v1/tracking?carrier=hmm&carrierBookingReference=SELM96466400&equipmentReference=ZZ
```

**주요 파라미터**:
| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `equipmentReference` | 컨테이너 번호 | `APZU4812090` |
| `transportDocumentReference` | B/L 번호 | `SEL1988565` |
| `carrierBookingReference` | Booking 번호 | `SELM96466400` |

---

## 🚢 선사별 지원 현황

| 선사 | Schedule API | Tracking API | 표준 | 비고 |
|------|-------------|--------------|------|------|
| **CMA CGM** | ✅ DCSA | ✅ DCSA | Full DCSA | 직접 매핑 |
| **HMM** | ⚠️ Proprietary | ⚠️ DCSA-based | Mapper 사용 | POST 방식 |
| **ZIM** | ⚠️ Proprietary | ✅ DCSA | Mapper 사용 (Schedule) | P2P만 지원 |
| **Maersk** | ✅ DCSA | ✅ DCSA | Full DCSA | 직접 매핑 |

### 선사별 필수 파라미터

| 선사 | Schedule | Tracking |
|------|----------|----------|
| CMA CGM | 선택적 | `equipmentReference` 또는 `transportDocumentReference` |
| HMM | `carrierVoyageNumber` 필수 | `carrierBookingReference` + `equipmentReference` 필수 |
| ZIM | `originCode`, `destCode`, `fromDate`, `toDate` | `equipmentReference` |
| Maersk | 선택적 | `equipmentReference` 또는 `transportDocumentReference` |

---

## 🔑 API Key 발급

| 선사 | 포털 | 인증 방식 |
|------|------|----------|
| CMA CGM | [api-portal.cma-cgm.com](https://api-portal.cma-cgm.com/) | API Key / OAuth2 |
| HMM | HMM API Gateway | API Key |
| ZIM | ZIM API Portal | API Key |
| Maersk | [developer.maersk.com](https://developer.maersk.com/) | OAuth2 + API Key |

---

## 📁 NPM Scripts

```bash
npm run dev      # 개발 서버 실행 (ts-node)
npm run build    # TypeScript 컴파일
npm start        # 프로덕션 서버 실행
npm run watch    # 파일 변경 감지 빌드
npm run lint     # ESLint 실행
npm run format   # Prettier 포맷팅
```

---

## 📄 License

MIT
