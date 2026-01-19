# CMA CGM Schedule APIs 구현 가이드

## 📋 개요

CMA CGM의 3가지 Schedule API를 구현했습니다:
1. **Proforma API** (Lines & Services) - `vesseloperation.proforma.v2`
2. **Voyage API** - `vesseloperation.voyage.v2`
3. **Route API** (Routing Finder) - `vesseloperation.route.v2`

---

## 🏗️ 구조 설계

### Adapter 계층 구조

```
CMACGMAdapter (Main Adapter)
├── CMACGMScheduleAdapter (Commercial Schedule - DCSA)
├── CMACGMProformaAdapter (Lines & Services)
├── CMACGMVoyageAdapter (Voyages)
├── CMACGMRouteAdapter (Routing Finder)
└── CMACGMTrackingAdapter (Track & Trace)
```

### API 선택 로직

`CMACGMAdapter.getSchedule()` 메서드가 파라미터에 따라 자동으로 적절한 API를 선택합니다:

1. **Route API** (최우선)
   - 조건: `placeOfLoading`/`unLocodePlaceOfLoading` + `placeOfDischarge`/`unLocodePlaceOfDischarge`
   - 용도: 포트 간 라우팅 및 스케줄 조회

2. **Voyage API**
   - 조건: `voyageCode`, `vesselIMO`, `(from + to)`, `portCode`, `countryCode` 중 하나 이상
   - 용도: 항해 정보, 콜 정보 조회

3. **Proforma API**
   - 조건: `serviceCode`, `lineCode`, `(zoneFromCode + zoneToCode)` 중 하나 이상
   - 용도: 서비스/라인 정보, 프로포마 콜 조회

4. **Commercial Schedule API** (기본값)
   - 조건: 위 조건들이 모두 없을 때
   - 용도: DCSA 표준 스케줄 조회

---

## 🔧 설정

### Config 파일 업데이트

`config/carriers/cma-cgm.json`에 새로운 API 엔드포인트가 추가되었습니다:

```json
{
  "apis": {
    "proforma": {
      "endpoint": "/vesseloperation/proforma/v2",
      "version": "2.2.1",
      "standard": "PROPRIETARY",
      "method": "GET",
      "supportsPagination": true
    },
    "voyage": {
      "endpoint": "/vesseloperation/voyage/v2",
      "version": "2.6.2",
      "standard": "PROPRIETARY",
      "method": "GET",
      "supportsPagination": true
    },
    "route": {
      "endpoint": "/vesseloperation/route/v2",
      "version": "2.9.3",
      "standard": "PROPRIETARY",
      "method": "GET",
      "supportsPagination": true
    }
  },
  "auth": {
    "apiKeys": {
      "proforma": "CMCG_API_KEY",
      "voyage": "CMCG_API_KEY",
      "route": "CMCG_API_KEY"
    },
    "headerNames": {
      "proforma": "KeyId",
      "voyage": "KeyId",
      "route": "KeyId"
    }
  }
}
```

---

## 📡 API 사용 방법

### 1. Proforma API (Lines & Services)

#### 서비스 코드로 조회
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&serviceCode=FAL"
```

#### 라인 코드로 조회
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&lineCode=FAL"
```

#### Zone으로 서비스 검색
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&zoneFromCode=ASIE&zoneToCode=WEUR"
```

#### 서비스 검색 (다양한 필터)
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&port=FRMRS&vesselIMO=9839179"
```

**지원 파라미터:**
- `serviceCode`: 서비스 코드
- `lineCode`: 라인 코드
- `zoneFromCode`: 출발 Zone 코드 (ASIE, WEUR, MED, CARAIBES, AFR, ANZPAC, MDLEAST, NA, SA, ALL)
- `zoneToCode`: 도착 Zone 코드
- `port`: 포트 코드
- `terminal`: 터미널 코드
- `vesselIMO`: 선박 IMO 번호
- `codeContains`: 코드에 포함된 문자 (2자 이상)
- `nameContains`: 이름에 포함된 문자 (3자 이상)
- `serviceType`: 서비스 타입 (ExternalFeeder, Regular)

---

### 2. Voyage API

#### 항해 코드로 조회
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&voyageCode=0PFECE1MA"
```

#### 선박 IMO로 현재 스케줄 조회
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&vesselIMO=9839179"
```

#### 날짜 범위로 항해 검색
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&from=2025-01-01&to=2025-01-31"
```

#### 포트 코드로 콜 검색
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&portCode=FRMRS&from=2025-01-01&to=2025-01-31"
```

#### 국가 코드로 콜 검색
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&countryCode=FR&from=2025-01-01&to=2025-01-31"
```

**지원 파라미터:**
- `voyageCode`: 항해 코드
- `vesselIMO`: 선박 IMO 번호
- `from`: 시작 날짜 (YYYY-MM-DD)
- `to`: 종료 날짜 (YYYY-MM-DD)
- `portCode`: 포트 코드 (배열 가능, 최대 10개)
- `countryCode`: 국가 코드 (배열 가능, 최대 5개)
- `serviceCode`: 서비스 코드 (배열 가능, 최대 20개)
- `terminalCode`: 터미널 코드
- `shipcomp`: 운송 회사 코드 (배열 가능, 최대 4개, 기본값: 0001)
- `searchType`: 검색 타입 (`voyageFirstCall`, `voyageAnyCall`)
- `dateType`: 날짜 타입 (`berth`, `seaPassage`, `eosp`)
- `callId`: 콜 ID (배열 가능, 최대 20개)
- `sort`: 정렬 규칙

---

### 3. Route API (Routing Finder)

#### 포트 간 라우팅 조회 (CMA CGM 코드 사용)
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&placeOfLoading=CNSHA&placeOfDischarge=NLRTM"
```

#### 포트 간 라우팅 조회 (UN/Locode 사용)
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM"
```

#### 출발 날짜 지정
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM&departureDate=2025-01-15"
```

#### 도착 날짜 지정
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM&arrivalDate=2025-02-15"
```

#### 특정 선박으로 제한
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM&polVesselIMO=9839179"
```

#### 특정 서비스로 제한
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM&polServiceCode=FAL2"
```

**지원 파라미터:**
- `placeOfLoading`: 적재지 코드 (CMA CGM 코드)
- `placeOfDischarge`: 양하지 코드 (CMA CGM 코드)
- `unLocodePlaceOfLoading`: 적재지 UN/Locode
- `unLocodePlaceOfDischarge`: 양하지 UN/Locode
- `shippingCompany`: 선호 운송 회사 코드
- `departureDate`: 희망 출발 날짜 (YYYY-MM-DD)
- `arrivalDate`: 희망 도착 날짜 (YYYY-MM-DD)
- `searchRange`: 검색 범위 (일수, 기본값: 21, 최대: 35)
- `polVesselIMO`: 적재지에서 특정 선박 IMO로 제한
- `polServiceCode`: 적재지에서 특정 서비스 코드로 제한
- `maxTs`: 최대 환적 횟수 (기본값: 3)
- `numberOfTEU`: TEU 수 (발자국 계산용, 기본값: 1)
- `specificRoutings`: 특정 라우팅 태그 (`USGovernment`, `Commercial`)
- `useRoutingStatistics`: 라우팅 통계 사용 여부 (기본값: true)

---

## 🔄 데이터 변환

모든 Adapter는 CMA CGM의 Proprietary 응답을 DCSA 표준 `ServiceSchedule[]` 형식으로 변환합니다.

### 변환 예시

**Proforma API 응답:**
```json
{
  "code": "FAL",
  "name": "French Asia Line",
  "line": { "code": "FAL", "name": "ASIA - EUROPE" }
}
```

**→ DCSA 형식:**
```json
{
  "carrierServiceCode": "FAL",
  "carrierServiceName": "French Asia Line",
  "vesselSchedules": []
}
```

**Voyage API 응답:**
```json
{
  "code": "0PFECE1MA",
  "service": { "code": "FAL7", "name": "French Asia Line 7" },
  "vessel": { "imo": "9839179", "name": "CMA CGM JACQUES SAADE" },
  "calls": [...]
}
```

**→ DCSA 형식:**
```json
{
  "carrierServiceCode": "FAL7",
  "carrierServiceName": "French Asia Line 7",
  "vesselSchedules": [{
    "vessel": { "vesselIMONumber": "9839179", "name": "CMA CGM JACQUES SAADE" },
    "transportCalls": [...]
  }]
}
```

---

## 📝 주의사항

### 1. API 선택 우선순위
파라미터가 여러 API의 조건을 만족할 경우, 다음 우선순위로 선택됩니다:
1. Route API
2. Voyage API
3. Proforma API
4. Commercial Schedule API

### 2. 필수 파라미터
- **Route API**: `placeOfLoading`/`unLocodePlaceOfLoading` + `placeOfDischarge`/`unLocodePlaceOfDischarge` (둘 다 필수)
- **Voyage API**: 최소 하나 이상 (`voyageCode`, `vesselIMO`, `(from + to)`, `portCode`, `countryCode`)
- **Proforma API**: 최소 하나 이상 (`serviceCode`, `lineCode`, `(zoneFromCode + zoneToCode)`)

### 3. 페이지네이션
모든 API는 `range` 헤더를 사용한 페이지네이션을 지원합니다:
- 기본값: `0-49` (최대 50개)
- 헤더 형식: `range: 0-49`

### 4. 인증
모든 API는 동일한 API Key (`CMCG_API_KEY`)를 사용하며, `KeyId` 헤더에 포함됩니다.

---

## 🧪 테스트 예시

### Proforma API 테스트
```bash
# 서비스 코드로 조회
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&serviceCode=FAL"

# Zone으로 서비스 검색
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&zoneFromCode=ASIE&zoneToCode=WEUR"
```

### Voyage API 테스트
```bash
# 항해 코드로 조회
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&voyageCode=0PFECE1MA"

# 선박 IMO로 현재 스케줄 조회
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&vesselIMO=9839179"

# 날짜 범위로 항해 검색
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&from=2025-01-01&to=2025-01-31&serviceCode=FAL7"
```

### Route API 테스트
```bash
# 포트 간 라우팅 조회 (UN/Locode 사용)
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM"

# 출발 날짜 지정
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM&departureDate=2025-01-15"

# 특정 서비스로 제한
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM&polServiceCode=FAL2"
```

---

## 🔗 참고 링크

- [CMA CGM API Portal - Schedules](https://api-portal.cma-cgm.com/products/schedules)
- [Proforma API Documentation](https://api-portal.cma-cgm.com/products/schedules)
- [Voyage API Documentation](https://api-portal.cma-cgm.com/products/schedules)
- [Route API Documentation](https://api-portal.cma-cgm.com/products/schedules)

---

## 📊 구현 파일 목록

1. **Adapters:**
   - `src/adapters/carriers/cma-cgm/CMACGMProformaAdapter.ts`
   - `src/adapters/carriers/cma-cgm/CMACGMVoyageAdapter.ts`
   - `src/adapters/carriers/cma-cgm/CMACGMRouteAdapter.ts`
   - `src/adapters/carriers/cma-cgm/CMACGMAdapter.ts` (업데이트)

2. **Config:**
   - `config/carriers/cma-cgm.json` (업데이트)
   - `src/infrastructure/config/ConfigLoader.ts` (업데이트)

3. **HTTP Client:**
   - `src/adapters/http/HttpClient.ts` (업데이트)

4. **Controllers:**
   - `src/api/controllers/ScheduleController.ts` (업데이트)

