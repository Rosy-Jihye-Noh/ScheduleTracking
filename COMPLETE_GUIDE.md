# 선사 스케줄 조회 및 트래킹 시스템 - 완전 가이드

## 📋 목차
1. [현재 상황 분석](#현재-상황-분석)
2. [Mapper란 무엇인가?](#mapper란-무엇인가)
3. [제안 파일 구조](#제안-파일-구조)
4. [단계별 구현 로드맵](#단계별-구현-로드맵)
5. [프롬프트 전략 가이드](#프롬프트-전략-가이드)

---

## 현재 상황 분석

### 보유 선사 및 API 현황

#### Tracking API (Track & Trace)

| 선사 | 파일명 | DCSA 표준 준수 | 응답 구조 | Mapper 필요 |
|------|--------|----------------|----------|-------------|
| **CMA CGM** | `operation.trackandtrace.v1-swagger.json` | ✅ 완전 준수 | DCSA 표준 | ❌ 불필요 |
| **HMM** | `dcsaCargoTrackingv1OAS3-Swagger2.json` | ⚠️ 기반이지만 구조 다름 | 자체 구조 | ✅ **필요** |
| **ZIM** | `dcsa-track-and-trace-sandbox-v1.json` | ✅ 완전 준수 | DCSA 표준 | ❌ 불필요 |
| **Maersk** | `track--trace-events.json` | ✅ 완전 준수 | DCSA 표준 | ❌ 불필요 |

**Tracking API 결론**:
- **완전 DCSA 표준**: CMA CGM, ZIM, Maersk (3개) → 직접 매핑 가능
- **DCSA 기반이지만 응답 구조 다름**: HMM (1개) → **Mapper 필요**

#### Schedule API (Commercial Schedule)

| 선사 | 파일명 | DCSA 표준 준수 | 엔드포인트 구조 | Mapper 필요 |
|------|--------|----------------|-----------------|-------------|
| **CMA CGM** | `vesseloperation.commercialschedule.v1-swagger.json` | ✅ 완전 준수 | DCSA 표준 (GET) | ❌ 불필요 |
| **HMM** | `vesselSchedulev1OAS3-Swagger2.json`<br>`portSchedulev1OAS3-Swagger2.json`<br>`ptpSchedulev1OAS3-Swagger2.json` | ❌ 자체 스펙 | 자체 구조 (POST) | ✅ **필요** |
| **ZIM** | `vessel-schedule-sandbox-v2.json` | ❌ 자체 스펙 | 자체 구조 (GET) | ✅ **필요** |
| **Maersk** | `ocean---commercial-schedules-dcsa.json` | ✅ 완전 준수 | DCSA 표준 (GET) | ❌ 불필요 |

**Schedule API 결론**:
- **완전 DCSA 표준**: CMA CGM, Maersk (2개) → 직접 매핑 가능
- **자체 스펙**: HMM, ZIM (2개) → **Mapper 필요**

### 주요 발견사항

1. **HMM Tracking API의 특이점**:
   - DCSA 데이터 모델 사용 (eventType, eventClassifierCode 등)
   - 하지만 응답 구조가 다름:
     - **DCSA 표준**: `{events[]}` 배열에 모든 이벤트 통합
     - **HMM**: `{shipment, transport, equipment, shipmentEvent[], transportEvent[], equipmentEvent[], transportCall[]}` 분리 구조
   - **결론**: Mapper에서 HMM 응답을 DCSA `events[]` 구조로 변환 필요

2. **HMM Schedule API**:
   - 3개 파일 모두 자체 스펙 (Vessel, Port, P2P)
   - 모두 POST 메서드 사용 (DCSA는 GET)
   - 응답 구조가 DCSA와 완전히 다름 (resultData, resultCode 등)

3. **ZIM Schedule API**:
   - Point-to-Point만 제공 (DCSA는 3가지: P2P, Port, Vessel)
   - 자체 응답 구조

---

## Mapper란 무엇인가?

### 🎯 Mapper의 개념

**Mapper는 코드에서 구현하는 데이터 변환 레이어입니다.**

- **사용자가 찾아서 주는 것이 아닙니다**
- **Swagger 파일을 보고 우리가 직접 구현해야 합니다**
- 선사별 API 응답을 DCSA 표준 모델로 변환하는 로직

### 📝 Mapper가 필요한 이유

각 선사는 서로 다른 API 구조를 사용합니다:

```
HMM API 응답:
{
  "resultData": [
    {
      "vvdCode": "JARK0016W",
      "portCode": "SGSIN",
      "vesselName": "AL MURAYKH",
      "arrival": {
        "arrivalDate": "20210817",
        "arrivalTime": "2100"
      }
    }
  ],
  "resultCode": "Success"
}
```

이것을 DCSA 표준 모델로 변환해야 합니다:

```typescript
// DCSA 표준 모델
{
  "carrierServiceCode": "...",
  "vesselSchedules": [
    {
      "vessel": {
        "vesselIMONumber": "...",
        "name": "AL MURAYKH"
      },
      "transportCalls": [
        {
          "UNLocationCode": "SGSIN",
          "timestamps": [
            {
              "eventTypeCode": "ARRI",
              "eventDateTime": "2021-08-17T21:00:00Z"
            }
          ]
        }
      ]
    }
  ]
}
```

### 🔧 Mapper의 역할

1. **필드명 변환**: `vvdCode` → `carrierVoyageNumber`
2. **구조 변환**: 분리된 배열을 통합된 구조로 변환
3. **데이터 타입 변환**: `"20210817"` → `"2021-08-17T00:00:00Z"`
4. **기본값 처리**: 필수 필드가 없을 때 기본값 설정
5. **에러 처리**: 변환 불가능한 데이터 처리

### 📂 Mapper 파일 위치

```
src/adapters/carriers/hmm/mappers/
├── scheduleMapper.ts      # HMM Schedule → DCSA Schedule 변환
└── trackingMapper.ts      # HMM Tracking → DCSA Events 변환
```

### 💡 Mapper 구현 예시

```typescript
// src/adapters/carriers/hmm/mappers/scheduleMapper.ts

export function mapHMMScheduleToDCSA(hmmResponse: HMMScheduleResponse): ServiceSchedule {
  return {
    carrierServiceCode: extractServiceCode(hmmResponse),
    carrierServiceName: extractServiceName(hmmResponse),
    vesselSchedules: hmmResponse.resultData.map(item => ({
      vessel: {
        vesselIMONumber: extractIMONumber(item),
        name: item.vesselName
      },
      transportCalls: [{
        UNLocationCode: item.portCode,
        timestamps: [
          {
            eventTypeCode: "ARRI",
            eventDateTime: convertDateTime(item.arrival.arrivalDate, item.arrival.arrivalTime),
            eventClassifierCode: "EST"
          },
          {
            eventTypeCode: "DEPA",
            eventDateTime: convertDateTime(item.departure.departureDate, item.departure.departureTime),
            eventClassifierCode: "EST"
          }
        ]
      }]
    }))
  };
}
```

**결론**: Mapper는 **우리가 Swagger 파일을 분석해서 직접 구현하는 코드**입니다!

---

## 제안 파일 구조

```
ScheduleTracking/
├── README.md
├── COMPLETE_GUIDE.md                    # 본 문서
│
├── config/                               # 설정 파일 (코드 외부 관리)
│   ├── carriers/
│   │   ├── cma-cgm.json
│   │   ├── hmm.json
│   │   ├── zim.json
│   │   ├── maersk.json
│   │   └── template.json                 # 신규 선사 추가 템플릿
│   ├── app.json                          # 애플리케이션 전역 설정
│   └── .env.example                      # 환경 변수 예시
│
├── src/
│   ├── domain/                           # 도메인 레이어 (비즈니스 로직)
│   │   ├── models/
│   │   │   ├── schedule.ts               # 통합 Schedule 모델 (DCSA 기반)
│   │   │   ├── tracking.ts               # 통합 Tracking 모델 (DCSA 기반)
│   │   │   └── common.ts                 # 공통 모델 (Vessel, Location 등)
│   │   └── services/
│   │       ├── ScheduleService.ts        # 스케줄 비즈니스 로직
│   │       └── TrackingService.ts       # 트래킹 비즈니스 로직
│   │
│   ├── adapters/                         # 어댑터 레이어 (외부 API 통합)
│   │   ├── carriers/
│   │   │   ├── base/
│   │   │   │   ├── CarrierAdapter.ts     # 기본 어댑터 인터페이스
│   │   │   │   ├── ScheduleAdapter.ts   # Schedule 어댑터 인터페이스
│   │   │   │   └── TrackingAdapter.ts   # Tracking 어댑터 인터페이스
│   │   │   │
│   │   │   ├── cma-cgm/
│   │   │   │   ├── CMACGMAdapter.ts
│   │   │   │   ├── CMACGMScheduleAdapter.ts    # DCSA 표준 → 직접 매핑
│   │   │   │   ├── CMACGMTrackingAdapter.ts    # DCSA 표준 → 직접 매핑
│   │   │   │   └── mappers/                    # 최소 매퍼 (필요시)
│   │   │   │
│   │   │   ├── hmm/
│   │   │   │   ├── HMMAdapter.ts
│   │   │   │   ├── HMMScheduleAdapter.ts
│   │   │   │   ├── HMMTrackingAdapter.ts
│   │   │   │   └── mappers/                    # ⭐ Mapper 필수
│   │   │   │       ├── scheduleMapper.ts      # HMM → DCSA 변환
│   │   │   │       └── trackingMapper.ts      # HMM → DCSA 변환
│   │   │   │
│   │   │   ├── zim/
│   │   │   │   ├── ZIMAdapter.ts
│   │   │   │   ├── ZIMScheduleAdapter.ts      # 자체 스펙
│   │   │   │   ├── ZIMTrackingAdapter.ts      # DCSA 표준 → 직접 매핑
│   │   │   │   └── mappers/
│   │   │   │       └── scheduleMapper.ts      # ⭐ Mapper 필수
│   │   │   │
│   │   │   └── maersk/
│   │   │       ├── MaerskAdapter.ts
│   │   │       ├── MaerskScheduleAdapter.ts   # DCSA 표준 → 직접 매핑
│   │   │       ├── MaerskTrackingAdapter.ts   # DCSA 표준 → 직접 매핑
│   │   │       └── mappers/                    # 최소 매퍼 (필요시)
│   │   │
│   │   ├── http/
│   │   │   ├── HttpClient.ts             # HTTP 클라이언트 래퍼
│   │   │   ├── AuthManager.ts            # 통합 인증 관리 (OAuth2, API Key)
│   │   │   └── RetryHandler.ts           # 재시도 로직
│   │   │
│   │   └── factory/
│   │       └── CarrierAdapterFactory.ts  # 어댑터 팩토리 (동적 생성)
│   │
│   ├── infrastructure/                   # 인프라 레이어
│   │   ├── cache/
│   │   │   └── CacheManager.ts           # 캐싱 전략
│   │   ├── logger/
│   │   │   └── Logger.ts                 # 구조화된 로깅
│   │   ├── error/
│   │   │   └── ErrorHandler.ts           # 통합 에러 처리
│   │   └── config/
│   │       └── ConfigLoader.ts          # 설정 파일 로더
│   │
│   ├── api/                              # API 레이어
│   │   ├── routes/
│   │   │   ├── schedule.routes.ts
│   │   │   └── tracking.routes.ts
│   │   ├── controllers/
│   │   │   ├── ScheduleController.ts
│   │   │   └── TrackingController.ts
│   │   ├── middleware/
│   │   │   ├── validation.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── carrierFilter.ts         # 선사 필터링 미들웨어
│   │   └── dto/                          # Data Transfer Objects
│   │       ├── schedule.dto.ts
│   │       └── tracking.dto.ts
│   │
│   └── utils/                            # 유틸리티
│       ├── dateUtils.ts
│       ├── codeUtils.ts                  # UN Location Code 등
│       └── validation.ts
│
├── swagger/                              # Swagger 파일 보관
│   ├── cma-cgm/
│   ├── hmm/
│   ├── zim/
│   └── maersk/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── docs/
    ├── API.md
    ├── CARRIER_INTEGRATION.md
    └── DEPLOYMENT.md
```

---

## 단계별 구현 로드맵

### Phase 1: 기반 구조 구축 (1일)
**목표**: 확장 가능한 기본 아키텍처 설정

**작업 내용**:
1. TypeScript 프로젝트 초기화
2. 기본 디렉토리 구조 생성
3. 도메인 모델 정의 (DCSA 기반)
4. 어댑터 인터페이스 설계
5. 설정 파일 구조 설계

### Phase 2: DCSA 표준 선사 통합 (2일)
**목표**: CMA CGM, Maersk 우선 구현 (변환 로직 최소화)

**작업 내용**:
1. CMA CGM 어댑터 구현 (Tracking, Schedule)
2. Maersk 어댑터 구현 (Tracking, Schedule)
3. OAuth2 인증 관리자 구현
4. 통합 테스트

### Phase 3: 비표준 선사 통합 (2일)
**목표**: HMM, ZIM 통합 (Mapper 레이어 구현)

**작업 내용**:
1. HMM 어댑터 및 Mapper 구현
   - Tracking Mapper: HMM 응답 구조 → DCSA events[] 변환
   - Schedule Mapper: HMM 자체 스펙 → DCSA 모델 변환
2. ZIM 어댑터 및 Mapper 구현
   - Schedule Mapper: ZIM 자체 스펙 → DCSA 모델 변환
3. API Key 인증 관리자 구현
4. 통합 테스트

### Phase 4: 통합 API 레이어 (1일)
**목표**: 모든 선사를 통합하는 REST API 제공

**작업 내용**:
1. REST API 엔드포인트 구현
2. 선사 필터링 기능
3. 에러 처리 및 로깅
4. API 문서화

### Phase 5: 최적화 및 문서화 (1일)
**목표**: 프로덕션 준비

**작업 내용**:
1. 캐싱 전략 적용
2. 성능 최적화
3. 문서화 완료
4. 배포 가이드 작성

**총 예상 기간: 7일**

---

## 프롬프트 전략 가이드

### 🎯 핵심 원칙

#### 1. **단계별 점진적 구현**
❌ **나쁜 예**:
```
"CMA CGM, HMM, ZIM, Maersk 4개 선사의 스케줄 조회와 트래킹 기능을 모두 구현해줘"
```

✅ **좋은 예**:
```
"Phase 1을 시작해줘:
1. TypeScript 프로젝트 초기화 (package.json, tsconfig.json)
2. 위에서 제안한 파일 구조대로 기본 디렉토리 생성
3. src/domain/models/schedule.ts에 DCSA 기반 Schedule 도메인 모델 정의
4. src/adapters/carriers/base/CarrierAdapter.ts에 기본 인터페이스 정의"
```

#### 2. **구체적인 파일 경로와 구조 명시**
❌ **나쁜 예**:
```
"어댑터 패턴으로 선사별 API를 추상화해줘"
```

✅ **좋은 예**:
```
"src/adapters/carriers/cma-cgm/CMACGMScheduleAdapter.ts 파일을 생성하고,
ScheduleAdapter 인터페이스를 구현해줘:
- config/carriers/cma-cgm.json에서 API 설정 읽기
- DCSA Commercial Schedule API 호출
- 응답을 Schedule 도메인 모델로 매핑 (DCSA 표준이므로 직접 매핑)
- OAuth2 인증은 AuthManager 사용"
```

#### 3. **Mapper 구현 시 구체적인 변환 로직 명시**
❌ **나쁜 예**:
```
"HMM API 응답을 DCSA 모델로 변환하는 Mapper 만들어줘"
```

✅ **좋은 예**:
```
"HMM Vessel Schedule API 응답을 DCSA Schedule 모델로 변환하는 Mapper를 만들어줘:
1. src/adapters/carriers/hmm/mappers/scheduleMapper.ts 생성
2. HMM 응답 구조 분석 (HMM/vesselSchedulev1OAS3-Swagger2.json 참고):
   - resultData[].vvdCode → carrierVoyageNumber
   - resultData[].portCode → UNLocationCode
   - resultData[].vesselName → vessel.name
   - resultData[].arrival.arrivalDate + arrivalTime → timestamps (eventTypeCode: "ARRI")
   - resultData[].departure.departureDate + departureTime → timestamps (eventTypeCode: "DEPA")
3. 날짜 형식 변환: "20210817" + "2100" → ISO 8601 형식
4. 필수 필드 검증 및 기본값 처리
5. 에러 처리: 변환 실패 시 명확한 에러 메시지"
```

#### 4. **설정 파일 구조 명시**
❌ **나쁜 예**:
```
"CMA CGM API URL을 하드코딩해줘"
```

✅ **좋은 예**:
```
"config/carriers/cma-cgm.json 파일을 생성하고 다음 구조로 작성해줘:
{
  "name": "CMA CGM",
  "code": "CMCG",
  "baseUrl": "https://api.cma-cgm.com",
  "apis": {
    "schedule": {
      "endpoint": "/vesseloperation/commercialschedule/v1/vessel-schedules",
      "version": "1.0.7",
      "standard": "DCSA"
    },
    "tracking": {
      "endpoint": "/operation/trackandtrace/v1/events",
      "version": "2.2.0",
      "standard": "DCSA"
    }
  },
  "auth": {
    "type": "oauth2",
    "tokenUrl": "https://auth.cma-cgm.com/as/token.oauth2",
    "scopes": ["commercialschedule:read:be", "tandtcommercial:read:be"]
  },
  "features": {
    "supportsPagination": true,
    "maxLimit": 100
  }
}
그리고 src/infrastructure/config/ConfigLoader.ts에서 이 설정을 읽어오도록 구현해줘"
```

#### 5. **에러 처리 전략 명시**
❌ **나쁜 예**:
```
"에러가 나면 로그만 찍어줘"
```

✅ **좋은 예**:
```
"src/infrastructure/error/ErrorHandler.ts에 통합 에러 핸들러를 만들어줘:
- 선사별 API 실패 시: 해당 선사만 제외하고 다른 선사 결과 반환
- 네트워크 타임아웃: 재시도 로직 (최대 3회, exponential backoff)
- 인증 실패: 명확한 에러 메시지와 함께 401 반환
- DCSA 에러 응답 파싱: ErrorResponse 스키마에 맞춰 파싱
- 모든 에러는 구조화된 로그로 기록:
  {
    carrier: "CMA CGM",
    endpoint: "/vessel-schedules",
    errorType: "NETWORK_TIMEOUT",
    timestamp: "2025-01-15T10:30:00Z"
  }"
```

---

## 📋 단계별 프롬프트 예시

### Phase 1 프롬프트
```
Phase 1: 프로젝트 기반 구조를 구축해줘.

1. TypeScript + Node.js 프로젝트 초기화
   - package.json 생성 (필수 의존성: express, axios, dotenv, winston, typescript)
   - tsconfig.json 설정 (strict mode)
   - .gitignore 생성

2. 기본 디렉토리 구조 생성 (위 제안 구조 참고)

3. src/domain/models/schedule.ts에 DCSA 기반 Schedule 도메인 모델 정의
   - ServiceSchedule 인터페이스
   - VesselSchedule 인터페이스
   - TransportCall 인터페이스
   - Timestamp 인터페이스
   - DCSA 표준을 최대한 따르되, 모든 선사가 공통으로 사용 가능하도록 설계

4. src/adapters/carriers/base/CarrierAdapter.ts에 기본 인터페이스 정의
   - getSchedule(params: ScheduleQueryParams): Promise<ServiceSchedule[]>
   - getTracking(params: TrackingQueryParams): Promise<TrackingEvent[]>
   - getCarrierCode(): string

5. config/carriers/template.json 생성
   - 선사 설정 파일 템플릿
   - 모든 필수 필드와 옵션 필드 명시
```

### Phase 2 프롬프트 (CMA CGM - DCSA 표준)
```
CMA CGM 선사를 통합해줘 (DCSA 표준 선사).

1. config/carriers/cma-cgm.json 생성 (위 구조 참고)

2. src/adapters/http/AuthManager.ts에 OAuth2 토큰 관리 로직 구현
   - 토큰 캐싱 (만료 전 갱신)
   - 자동 토큰 갱신
   - 선사별 토큰 관리

3. src/adapters/carriers/cma-cgm/CMACGMScheduleAdapter.ts 구현
   - ScheduleAdapter 인터페이스 구현
   - config에서 설정 읽기
   - OAuth2 인증 처리 (AuthManager 사용)
   - DCSA Commercial Schedule API 호출
   - 응답을 Schedule 도메인 모델로 직접 매핑 (DCSA 표준이므로 변환 최소화)

4. src/adapters/carriers/cma-cgm/CMACGMTrackingAdapter.ts 구현
   - TrackingAdapter 인터페이스 구현
   - DCSA Track & Trace API 호출
   - 응답을 TrackingEvent 도메인 모델로 직접 매핑

5. src/adapters/carriers/cma-cgm/CMACGMAdapter.ts 구현
   - CarrierAdapter 인터페이스 구현
   - ScheduleAdapter와 TrackingAdapter 조합
```

### Phase 3 프롬프트 (HMM - Mapper 필요)
```
HMM 선사를 통합해줘 (Mapper 필요).

1. config/carriers/hmm.json 생성
   - baseUrl: "https://apigw.hmm21.com"
   - API Key 인증 설정
   - 3개 Schedule API 엔드포인트 설정 (vessel, port, ptp)

2. src/adapters/http/AuthManager.ts에 API Key 인증 추가
   - API Key 방식 지원 (기존 OAuth2와 병행)

3. src/adapters/carriers/hmm/mappers/trackingMapper.ts 생성
   - HMM Tracking 응답 → DCSA Events 모델 변환
   - HMM 응답 구조:
     {
       shipment: {...},
       transport: {...},
       equipment: {...},
       shipmentEvent: [...],
       transportEvent: [...],
       equipmentEvent: [...],
       transportCall: [...]
     }
   - DCSA 표준 구조:
     {
       events: [
         {eventType: "SHIPMENT", ...},
         {eventType: "TRANSPORT", ...},
         {eventType: "EQUIPMENT", ...}
       ]
     }
   - 변환 로직:
     * shipmentEvent[], transportEvent[], equipmentEvent[] 배열을 하나의 events[] 배열로 통합
     * 각 이벤트에 eventType 필드 추가
     * transportCall 정보를 각 이벤트에 연결

4. src/adapters/carriers/hmm/mappers/scheduleMapper.ts 생성
   - HMM Vessel Schedule 응답 → DCSA Schedule 모델 변환
   - HMM 응답 구조 (vesselSchedulev1OAS3-Swagger2.json 참고):
     {
       resultData: [{
         vvdCode: "JARK0016W",
         portCode: "SGSIN",
         vesselName: "AL MURAYKH",
         arrival: {arrivalDate: "20210817", arrivalTime: "2100"},
         departure: {departureDate: "20210818", departureTime: "1400"}
       }],
       resultCode: "Success"
     }
   - DCSA 구조로 변환:
     * vvdCode → carrierVoyageNumber
     * portCode → UNLocationCode
     * vesselName → vessel.name
     * arrival → timestamps (eventTypeCode: "ARRI")
     * departure → timestamps (eventTypeCode: "DEPA")
   - 날짜 형식 변환: "20210817" + "2100" → "2021-08-17T21:00:00Z"
   - 필수 필드 검증 및 기본값 처리

5. src/adapters/carriers/hmm/HMMScheduleAdapter.ts 구현
   - ScheduleAdapter 인터페이스 구현
   - HMM Vessel Schedule API 호출 (POST /gateway/vesselSchedule/v1/vessel-schedule)
   - 응답을 Mapper로 변환

6. src/adapters/carriers/hmm/HMMTrackingAdapter.ts 구현
   - TrackingAdapter 인터페이스 구현
   - HMM Cargo Tracking API 호출
   - 응답을 Mapper로 변환
```

### Phase 4 프롬프트 (통합 API)
```
통합 API 레이어를 구축해줘.

1. src/adapters/factory/CarrierAdapterFactory.ts 생성
   - config/carriers/ 폴더의 모든 설정 파일 읽기
   - 선사별 어댑터 동적 생성
   - 싱글톤 패턴으로 어댑터 재사용

2. src/api/routes/schedule.routes.ts 생성
   - GET /api/v1/schedules 엔드포인트
   - 쿼리 파라미터:
     * carrier: "cma-cgm" | "hmm" | "zim" | "maersk" | "all"
     * carrierServiceCode, vesselIMONumber, startDate, endDate 등
   - carrier=all일 경우 모든 선사 병렬 조회

3. src/api/controllers/ScheduleController.ts 구현
   - 요청 파라미터 검증
   - CarrierAdapterFactory로 어댑터 가져오기
   - 선사별 조회 (병렬 처리)
   - 결과 통합 및 반환
   - 에러 처리: 한 선사 실패 시 다른 선사 결과는 정상 반환

4. src/api/middleware/carrierFilter.ts 생성
   - carrier 파라미터 검증
   - 지원하는 선사 목록 확인

5. Express 앱 설정 (src/app.ts 또는 src/index.ts)
   - 라우트 등록
   - 에러 핸들러 미들웨어
   - CORS 설정
```

---

## 🔄 반복 작업 시 프롬프트 패턴

### 새 선사 추가 시
```
[선사명] 선사를 추가해줘:

1. swagger/[선사명]/ 폴더에 Swagger 파일 배치
2. config/carriers/[선사명].json 생성
   - template.json 참고하여 작성
   - API 엔드포인트, 인증 방식, 표준 여부 등 명시
3. src/adapters/carriers/[선사명]/ 폴더 생성
4. DCSA 표준이면:
   - [선사명]ScheduleAdapter.ts 구현 (직접 매핑)
   - [선사명]TrackingAdapter.ts 구현 (직접 매핑)
5. 비표준이면:
   - mappers/scheduleMapper.ts 생성 (변환 로직)
   - mappers/trackingMapper.ts 생성 (변환 로직)
   - 어댑터에서 Mapper 사용
6. 통합 테스트 추가
```

### Mapper 수정 시
```
HMM scheduleMapper.ts를 수정해줘:
- [구체적인 변환 로직 설명]
- [변경할 필드 매핑]
- [에러 처리 개선사항]
```

---

## ⚠️ 주의사항 및 Best Practices

### 1. **한 번에 너무 많은 것을 요청하지 말 것**
- 한 번에 1-2개 파일, 1개 기능만 구현 요청
- 복잡한 기능은 단계별로 분해

### 2. **기존 코드 구조 존중**
- 이미 구현된 패턴을 따를 것
- 일관성 유지

### 3. **테스트 포함 요청**
- 새 기능 추가 시 테스트 코드도 함께 요청
- "이 기능에 대한 단위 테스트도 작성해줘" 추가

### 4. **문서화 요청**
- 복잡한 로직은 주석과 함께 요청
- "이 로직에 대한 JSDoc 주석도 추가해줘"

### 5. **에러 케이스 고려**
- "에러 처리도 포함해줘" 명시
- "필수 필드 누락 시 어떻게 처리할지" 명시

### 6. **Swagger 파일 참조**
- Mapper 구현 시 "HMM/vesselSchedulev1OAS3-Swagger2.json 파일을 참고해서" 명시
- 실제 응답 예시를 보면서 변환 로직 작성

---

## 🚀 즉시 시작 가능한 첫 프롬프트

```
Phase 1을 시작해줘:

1. TypeScript + Node.js 프로젝트 초기화
   - package.json 생성 (필수 의존성: express, axios, dotenv, winston, typescript)
   - tsconfig.json 설정
   - .gitignore 생성

2. 위에서 제안한 파일 구조대로 기본 디렉토리 생성
   - src/domain/models/
   - src/adapters/carriers/base/
   - src/infrastructure/
   - config/carriers/
   - swagger/ (기존 파일들 이동)

3. src/domain/models/schedule.ts에 DCSA 기반 Schedule 도메인 모델 정의
   - ServiceSchedule, VesselSchedule, TransportCall, Timestamp 등
   - DCSA 표준을 기반으로 하되, 모든 선사가 공통으로 사용할 수 있는 통합 모델

4. src/adapters/carriers/base/CarrierAdapter.ts에 기본 인터페이스 정의
   - getSchedule, getTracking 메서드 시그니처
   - ScheduleAdapter, TrackingAdapter 인터페이스 분리

5. config/carriers/template.json 생성
   - 선사 설정 파일 템플릿
   - 모든 필수 필드와 옵션 필드 명시
```

이 프롬프트로 시작하면, 이후 단계별로 점진적으로 확장할 수 있습니다.

---

## 📚 참고사항

- **DCSA 표준 우선**: 가능한 한 DCSA 표준을 따르되, 비표준 API는 변환 레이어로 처리
- **확장성 고려**: 새로운 선사 추가 시 기존 코드 수정 최소화
- **테스트 가능성**: 각 레이어를 독립적으로 테스트 가능하도록 설계
- **문서화**: 코드와 함께 문서도 함께 작성하여 유지보수성 확보
- **성능**: 선사별 병렬 조회, 캐싱 전략으로 응답 시간 최적화
- **Mapper는 코드**: Swagger 파일을 보고 직접 구현하는 변환 로직

