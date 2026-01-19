# HMM vs CMA CGM Track & Trace API 비교

## 📋 개요

이 문서는 HMM과 CMA CGM의 Track & Trace API 호출 구조를 비교 분석합니다.

---

## 🔍 1. API 기본 정보

| 항목 | HMM | CMA CGM |
|------|-----|---------|
| **Base URL** | `https://apigw.hmm21.com` | `https://apis.cma-cgm.net` |
| **Endpoint** | `/gateway/dcsaCargoTracking/v1/cargo-tracking-dcsa` | `/operation/trackandtrace/v1/events` |
| **HTTP Method** | `GET` | `GET` |
| **API 표준** | DCSA 기반 (Proprietary 구조) | DCSA 2.2.0 완전 준수 |
| **인증 방식** | API Key (`x-Gateway-APIKey` 헤더) | API Key (`keyId` 헤더) |
| **데이터 변환** | ✅ Mapper 필요 (Proprietary → DCSA) | ❌ 불필요 (DCSA 표준) |

---

## 📥 2. 호출 파라미터 비교

### 2.1 HMM Tracking API

#### 필수 파라미터
```typescript
{
  carrierBookingReference: string;  // 예: "SELM96466400"
  equipmentReference: string;        // 예: "ZZ" (모든 컨테이너 조회 시)
}
```

#### 호출 예시
```bash
GET /gateway/dcsaCargoTracking/v1/cargo-tracking-dcsa
  ?carrierBookingReference=SELM96466400
  &equipmentReference=ZZ
```

**특징:**
- ✅ **두 파라미터 모두 필수**
- ✅ `equipmentReference`에 `"ZZ"`를 입력하면 해당 Booking의 모든 컨테이너 조회
- ❌ 다른 필터링 옵션 없음 (단순 조회만 가능)

---

### 2.2 CMA CGM Tracking API

#### 엔드포인트 방식 (2가지)

##### 방식 1: Path Parameter 방식 (직접 조회)
```typescript
GET /operation/trackandtrace/v1/events/{trackingReference}
```

**파라미터:**
- `trackingReference` (path): B/L 번호, 컨테이너 번호, Booking 번호 등
- `behalfOf` (query, 선택): Third Party 고객 코드
- `limit` (query, 선택): 최대 반환 개수 (기본값: 100)
- `cursor` (query, 선택): 페이지네이션 커서

**호출 예시:**
```bash
GET /operation/trackandtrace/v1/events/SEL1988565
GET /operation/trackandtrace/v1/events/APZU4812090?limit=50
```

##### 방식 2: Query Parameter 방식 (필터링 조회)
```typescript
GET /operation/trackandtrace/v1/events
```

**주요 파라미터:**
- `transportDocumentReference` (선택): B/L 번호
- `equipmentReference` (선택): 컨테이너 번호
- `carrierBookingReference` (선택): Booking 번호
- `eventType` (선택): `SHIPMENT`, `TRANSPORT`, `EQUIPMENT` (복수 선택 가능)
- `shipmentEventTypeCode` (선택): `RECE`, `DRFT`, `ISSU` 등
- `transportEventTypeCode` (선택): `ARRI`, `DEPA`
- `equipmentEventTypeCode` (선택): `LOAD`, `DISC`, `GTIN`, `GTOT` 등
- `vesselIMONumber` (선택): 선박 IMO 번호
- `UNLocationCode` (선택): UN Location Code
- `eventCreatedDateTime` (선택): 이벤트 생성 날짜 (연산자 지원: `:gte`, `:lte` 등)
- `limit` (선택): 최대 반환 개수
- `cursor` (선택): 페이지네이션 커서

**호출 예시:**
```bash
GET /operation/trackandtrace/v1/events?transportDocumentReference=SEL1988565
GET /operation/trackandtrace/v1/events?equipmentReference=APZU4812090&eventType=EQUIPMENT
GET /operation/trackandtrace/v1/events?carrierBookingReference=ABC123&eventType=SHIPMENT,TRANSPORT
```

**특징:**
- ✅ **유연한 조회 방식**: Path 또는 Query 방식 선택 가능
- ✅ **다양한 필터링 옵션**: 이벤트 타입, 날짜, 위치 등으로 필터링 가능
- ✅ **페이지네이션 지원**: 대량 데이터 처리 가능
- ✅ **복수 파라미터 조합 가능**: 여러 조건 동시 사용 가능

---

## 📤 3. 응답 구조 비교

### 3.1 HMM 응답 구조 (Proprietary)

```json
{
  "shipment": {
    "eventID": "CTP20111600055683",
    "carrierBookingReference": "SELM96466400",
    "deliveryDateTime": "2021-02-25T00:47:00-07:00",
    "carrierID": "HDMU"
  },
  "transport": {
    "eventID": "CTP20111600055683",
    "transportName": "MOL CELEBRATION",
    "modeOfTransportCode": "Vessel",
    "loadTransportCallId": "SELM964664001M1KRPUS",
    "dischargeTransportCallId": "SELM964664001M1USOAK",
    "vesselImoNumber": "9321251"
  },
  "equipment": {
    "ISOEquipmentCode": "45G1"
  },
  "shipmentEvent": [
    {
      "eventID": "WEBSELM964664001",
      "eventCreatedDateTime": "2020-11-13T18:07:22+09:00",
      "eventType": "Shipment",
      "eventClassifierCode": "ACT",
      "eventDateTime": "2020-11-13T18:07:22+09:00",
      "shipmentEventTypeCode": "RECE",
      "documentId": "SELM96466400",
      "documentTypeCode": "CBR"
    }
  ],
  "transportEvent": [
    {
      "eventID": "CTP201116000556832011",
      "eventCreatedDateTime": "2020-11-16T11:26:31+09:00",
      "eventType": "Transport",
      "eventClassifierCode": "ACT",
      "eventDateTime": "2021-01-14T16:43:00+09:00",
      "transportEventTypeCode": "ARRI",
      "transportCall": {
        "facilityTypeCode": "KRPUSPNC",
        "otherFacility": "1448 SEOUNGBUK-DONG, GANSEO-GU, BUSAN, KOREA",
        "modeOfTransport": "Truck",
        "UNLocationCode": "KRPUS",
        "location": "KRPUS"
      }
    }
  ],
  "equipmentEvent": [
    {
      "eventID": "CTP201116000556832011",
      "eventType": "Equipment",
      "eventCreatedDateTime": "2020-11-16T11:26:31+09:00",
      "eventDateTime": "2021-01-14T16:43:00+09:00",
      "eventClassifierCode": "ACT",
      "equipmentEventTypeCode": "GTIN",
      "ISOEquipmentCode": "45G1",
      "emptyIndicatorCode": "Laden",
      "eventLocation": "KRPUS",
      "transportCall": {
        "UNLocationCode": "KRPUS",
        "facilityCode": "KRPUSPNC",
        "facilityTypeCode": "POTE",
        "otherFacility": "1448 SEOUNGBUK-DONG, GANSEO-GU, BUSAN, KOREA",
        "modeOfTransport": "Truck",
        "location": "KRPUS"
      }
    }
  ],
  "transportCall": [
    {
      "transportCallID": "SELM964664001M1KRPUS",
      "carrierServiceCode": "PS6",
      "exportVoyageNumber": "0080E",
      "transportCallSequenceNumber": 1,
      "UNLocationCode": "KRPUS",
      "facilityCode": "KRPUSPNC",
      "otherFacility": "1448 SEOUNGBUK-DONG, GANSEO-GU, BUSAN, KOREA",
      "modeOfTransport": "VESSEL",
      "location": "KRPUS",
      "vessel": {
        "vesselIMONumber": "9321251",
        "vesselName": "MOL CELEBRATION",
        "vesselFlag": "BS",
        "vesselCallSignNumber": "C6WW7",
        "vesselOperatorCarrierCode": "JCEB"
      }
    }
  ]
}
```

**특징:**
- ❌ **Proprietary 구조**: DCSA 표준과 다른 구조
- ✅ **이벤트 분리**: `shipmentEvent`, `transportEvent`, `equipmentEvent` 배열로 분리
- ✅ **TransportCall 별도**: `transportCall` 배열로 별도 제공
- ⚠️ **Mapper 필요**: DCSA 표준으로 변환 필요

---

### 3.2 CMA CGM 응답 구조 (DCSA 표준)

```json
[
  {
    "eventType": "TRANSPORT",
    "eventID": "726e480af8f7d9635e7b216d5c17cfae28343285",
    "eventCreatedDateTime": "2025-11-28T16:16:33Z",
    "eventClassifierCode": "PLN",
    "eventDateTime": "2026-01-11T08:00:00+01:00",
    "transportEventTypeCode": "ARRI",
    "transportCall": {
      "transportCallID": "50004440796",
      "importVoyageNumber": "0WWPGE1MA",
      "UNLocationCode": "NGLKK",
      "facilityCode": "LFTL",
      "facilityCodeListProvider": "SMDG",
      "facilityTypeCode": "POTE",
      "modeOfTransport": "VESSEL",
      "location": {
        "locationName": "LEKKI, LA",
        "latitude": "6.4285",
        "longitude": "4.005688888",
        "UNLocationCode": "NGLKK",
        "address": {
          "name": "LEKKI FREE PORT",
          "street": "FREE TRADE ZONE LEKKI",
          "country": "NIGERIA"
        }
      },
      "vessel": {
        "vesselIMONumber": "9454395",
        "vesselName": "CMA CGM AMERIGO VESPUCCI",
        "vesselFlag": "MT",
        "vesselCallSignNumber": "9HA5406",
        "vesselOperatorCarrierCode": "CMA",
        "vesselOperatorCarrierCodeListProvider": "SMDG"
      },
      "transportCallSequenceNumber": 4
    },
    "carrierSpecificData": {
      "internalEventCode": "PVA",
      "internalEventLabel": "Vessel Arrival",
      "internalLocationCode": "NGLKK",
      "internalFacilityCode": "NGLKKDLEK",
      "bookingExportVoyageReference": "0DBMMW1MA",
      "transportationPhase": "Transshipment",
      "transportCallSequenceTotal": 6,
      "numberOfUnits": 4,
      "shipmentLocationType": "PTS"
    },
    "references": [
      {
        "referenceType": "EQ",
        "referenceValue": "MAGU2480027"
      }
    ],
    "documentReferences": [
      {
        "documentReferenceType": "BKG",
        "documentReferenceValue": "aa6b804c0cce02cb37ac9db2265e9444cc862a90a6de262cd698830a328967bf"
      }
    ]
  },
  {
    "eventType": "EQUIPMENT",
    "eventID": "831513093d2c31b002a224f2f0fc9ea0a1a448cb",
    "eventCreatedDateTime": "2025-11-25T12:19:04Z",
    "eventClassifierCode": "ACT",
    "eventDateTime": "2025-11-25T19:34:00+08:00",
    "equipmentEventTypeCode": "DISC",
    "equipmentReference": "TRHU3240046",
    "ISOEquipmentCode": "22G1",
    "emptyIndicatorCode": "LADEN",
    "transportCall": { /* ... */ },
    "documentReferences": [ /* ... */ ]
  }
]
```

**특징:**
- ✅ **DCSA 표준 준수**: DCSA 2.2.0 완전 준수
- ✅ **통합 배열**: 모든 이벤트 타입이 하나의 배열에 통합
- ✅ **이벤트 타입 구분**: `eventType` 필드로 구분 (`TRANSPORT`, `SHIPMENT`, `EQUIPMENT`)
- ✅ **상세 정보**: 위치 좌표, 주소, 선박 정보 등 상세 데이터 제공
- ✅ **Carrier Specific Data**: 선사별 추가 정보 제공
- ❌ **Mapper 불필요**: 바로 사용 가능

---

## 🔄 4. 데이터 변환 (Mapping)

### 4.1 HMM

**필요 여부:** ✅ **필수**

**변환 과정:**
1. Proprietary 구조 → DCSA 표준 구조
2. 이벤트 배열 통합 (`shipmentEvent`, `transportEvent`, `equipmentEvent` → 단일 배열)
3. TransportCall 매핑 (별도 배열 → 각 이벤트에 포함)
4. 필드명 변환 및 데이터 정규화

**Mapper 파일:** `src/adapters/carriers/hmm/mappers/trackingMapper.ts`

**주요 변환 로직:**
```typescript
// HMM 응답 구조
{
  shipmentEvent: [...],
  transportEvent: [...],
  equipmentEvent: [...],
  transportCall: [...]
}

// → DCSA 표준 구조
[
  { eventType: "SHIPMENT", ... },
  { eventType: "TRANSPORT", ... },
  { eventType: "EQUIPMENT", ... }
]
```

---

### 4.2 CMA CGM

**필요 여부:** ❌ **불필요**

**이유:**
- API 응답이 이미 DCSA 표준 형식
- 추가 변환 없이 바로 사용 가능
- 단순히 배열로 반환

**처리 로직:**
```typescript
// CMA CGM 응답은 이미 DCSA 표준
const response = await httpClient.get<TrackingEvent[]>(endpoint);
// 바로 반환 가능
return Array.isArray(response) ? response : [];
```

---

## 📊 5. 주요 차이점 요약

| 비교 항목 | HMM | CMA CGM |
|----------|-----|---------|
| **API 표준 준수** | ⚠️ DCSA 기반 (Proprietary 구조) | ✅ DCSA 2.2.0 완전 준수 |
| **필수 파라미터** | `carrierBookingReference` + `equipmentReference` (둘 다 필수) | 최소 1개 (B/L, 컨테이너, Booking 중 하나) |
| **조회 방식** | 단일 방식 (Query Parameter) | 2가지 방식 (Path/Query) |
| **필터링 옵션** | ❌ 없음 | ✅ 다양함 (이벤트 타입, 날짜, 위치 등) |
| **페이지네이션** | ❌ 미지원 | ✅ 지원 (cursor 기반) |
| **응답 구조** | Proprietary (이벤트 타입별 분리) | DCSA 표준 (통합 배열) |
| **데이터 변환** | ✅ Mapper 필요 | ❌ 불필요 |
| **이벤트 타입** | 배열로 분리 (`shipmentEvent`, `transportEvent`, `equipmentEvent`) | `eventType` 필드로 구분 |
| **TransportCall** | 별도 배열로 제공 | 각 이벤트에 포함 |
| **상세 정보** | 기본 정보만 | 위치 좌표, 주소 등 상세 정보 제공 |

---

## 💡 6. 사용 시나리오별 비교

### 시나리오 1: B/L 번호로 조회

**HMM:**
```bash
# ❌ 불가능 - carrierBookingReference와 equipmentReference 둘 다 필요
# B/L 번호만으로는 조회 불가
```

**CMA CGM:**
```bash
# ✅ 가능 - Path 방식
GET /operation/trackandtrace/v1/events/SEL1988565

# ✅ 가능 - Query 방식
GET /operation/trackandtrace/v1/events?transportDocumentReference=SEL1988565
```

---

### 시나리오 2: 컨테이너 번호로 조회

**HMM:**
```bash
# ❌ 불가능 - carrierBookingReference도 필요
# 컨테이너 번호만으로는 조회 불가
```

**CMA CGM:**
```bash
# ✅ 가능 - Path 방식
GET /operation/trackandtrace/v1/events/APZU4812090

# ✅ 가능 - Query 방식
GET /operation/trackandtrace/v1/events?equipmentReference=APZU4812090
```

---

### 시나리오 3: 특정 이벤트 타입만 조회

**HMM:**
```bash
# ❌ 불가능 - 필터링 옵션 없음
# 모든 이벤트 타입 반환
```

**CMA CGM:**
```bash
# ✅ 가능 - EQUIPMENT 이벤트만
GET /operation/trackandtrace/v1/events?equipmentReference=APZU4812090&eventType=EQUIPMENT

# ✅ 가능 - TRANSPORT 이벤트만
GET /operation/trackandtrace/v1/events?transportDocumentReference=SEL1988565&eventType=TRANSPORT
```

---

### 시나리오 4: 날짜 범위로 필터링

**HMM:**
```bash
# ❌ 불가능 - 날짜 필터링 옵션 없음
```

**CMA CGM:**
```bash
# ✅ 가능 - 연산자 지원
GET /operation/trackandtrace/v1/events?equipmentReference=APZU4812090&eventCreatedDateTime:gte=2025-11-01T00:00:00Z
```

---

## 🎯 7. 통합 API에서의 사용

### 통합 API 호출 예시

```bash
# HMM Tracking
curl "http://localhost:3000/api/v1/tracking?carrier=hmm&carrierBookingReference=SELM96466400&equipmentReference=ZZ"

# CMA CGM Tracking (B/L 번호)
curl "http://localhost:3000/api/v1/tracking?carrier=cma-cgm&transportDocumentReference=SEL1988565"

# CMA CGM Tracking (컨테이너 번호)
curl "http://localhost:3000/api/v1/tracking?carrier=cma-cgm&equipmentReference=APZU4812090"

# CMA CGM Tracking (필터링)
curl "http://localhost:3000/api/v1/tracking?carrier=cma-cgm&transportDocumentReference=SEL1988565&eventType=EQUIPMENT"
```

---

## 📝 8. 결론

### HMM의 특징
- ✅ **단순한 구조**: 필수 파라미터 2개만 제공하면 조회 가능
- ⚠️ **제한적 기능**: 필터링 옵션이 없어 모든 이벤트 반환
- ⚠️ **데이터 변환 필요**: Mapper를 통해 DCSA 표준으로 변환 필요
- ✅ **Booking 중심**: Booking 번호와 컨테이너 번호를 함께 제공해야 함

### CMA CGM의 특징
- ✅ **DCSA 완전 준수**: 표준 API로 바로 사용 가능
- ✅ **유연한 조회**: Path/Query 방식 선택 가능
- ✅ **강력한 필터링**: 다양한 조건으로 필터링 가능
- ✅ **페이지네이션 지원**: 대량 데이터 처리 가능
- ✅ **상세 정보 제공**: 위치 좌표, 주소 등 상세 데이터

### 권장 사용 사례

**HMM을 사용하는 경우:**
- Booking 번호와 컨테이너 번호를 모두 알고 있는 경우
- 단순히 모든 이벤트를 조회하고 싶은 경우

**CMA CGM을 사용하는 경우:**
- B/L 번호 또는 컨테이너 번호만 알고 있는 경우
- 특정 이벤트 타입만 조회하고 싶은 경우
- 날짜 범위나 위치로 필터링하고 싶은 경우
- DCSA 표준 데이터가 필요한 경우

---

## 📚 참고 자료

- [DCSA Track & Trace 2.2.0 Specification](https://dcsa.org/)
- [HMM API Portal](https://apiportal.hmm21.com/)
- [CMA CGM API Portal](https://api-portal.cma-cgm.com/)

