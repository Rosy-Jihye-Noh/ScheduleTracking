# API 테스트 가이드

## 현재 에러 상황 분석

### 정상적인 동작 (에러가 예상됨)

#### 1. HMM - 필수 파라미터 누락
**에러**: `HMM Schedule API requires carrierVoyageNumber (vvdCode) parameter`

**원인**: HMM은 `carrierVoyageNumber` 파라미터가 필수입니다.

**해결**: 쿼리 파라미터를 추가하세요:
```bash
curl "http://localhost:3000/api/v1/schedules?carrier=hmm&carrierVoyageNumber=YOUR_VOYAGE_CODE"
```

---

### 설정 문제 (해결 필요)

#### 2. ZIM - API Key 인증 실패
**에러**: `401 Unauthorized - Access denied due to invalid subscription key`

**원인**: `.env` 파일에 ZIM API Key가 설정되지 않았거나 잘못되었습니다.

**해결**:
1. `.env` 파일을 열고 다음을 추가/수정:
```env
# ZIM Primary/Secondary Keys
ZIM_PRIMARY_KEY_SCHEDULE=your_primary_key_here
ZIM_SECONDARY_KEY_SCHEDULE=your_secondary_key_here
ZIM_PRIMARY_KEY_TRACKING=your_primary_key_here
ZIM_SECONDARY_KEY_TRACKING=your_secondary_key_here
```

2. 서버를 재시작:
```bash
# Ctrl+C로 서버 중지 후
npm run dev
```

---

#### 3. CMA CGM - DNS 조회 실패
**에러**: `getaddrinfo ENOTFOUND api.cma-cgm.com`

**원인**: 
- 네트워크 연결 문제
- 잘못된 baseUrl
- API Key가 설정되지 않음

**해결**:
1. `.env` 파일에 CMA CGM API Key 추가:
```env
CMCG_API_KEY=your_cma_cgm_api_key_here
```

2. 네트워크 연결 확인:
```bash
ping api.cma-cgm.com
```

3. baseUrl이 올바른지 CMA CGM API 포털에서 확인

---

#### 4. MAERSK - OAuth2 토큰 URL 404
**에러**: `Failed to obtain OAuth2 token for MAERSK: 404 Not Found`

**원인**: OAuth2 토큰 URL이 잘못되었거나 변경되었습니다.

**해결**:
1. `.env` 파일에 Maersk 인증 정보 추가:
```env
MAERSK_CONSUMER_KEY=your_consumer_key_here
MAERSK_SECRET_KEY=your_secret_key_here
```

2. Maersk Developer Portal에서 올바른 토큰 URL 확인
3. `config/carriers/maersk.json`의 `tokenUrl` 수정 (필요시)

---

## 올바른 테스트 방법

### 1. Health Check (정상 작동)
```bash
curl http://localhost:3000/health
```

### 2. Schedule API 테스트 (파라미터 필요)
```bash
# HMM (carrierVoyageNumber 필수)
curl "http://localhost:3000/api/v1/schedules?carrier=hmm&carrierVoyageNumber=YOUR_VOYAGE"

# ZIM (originCode, destCode, fromDate, toDate 필요)
curl "http://localhost:3000/api/v1/schedules?carrier=zim&originCode=USNYC&destCode=KRPUS&fromDate=2024-01-01&toDate=2024-12-31"

# CMA CGM (선택적 파라미터)
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&vesselIMONumber=9321483"

# Maersk (선택적 파라미터)
curl "http://localhost:3000/api/v1/schedules?carrier=maersk&vesselIMONumber=9321483"

# 모든 선사 (파라미터 없으면 대부분 실패)
curl "http://localhost:3000/api/v1/schedules?carrier=all&vesselIMONumber=9321483"
```

### 3. Tracking API 테스트
```bash
# 최소 하나의 참조 필요 (carrierBookingReference, transportDocumentReference, equipmentReference)
curl "http://localhost:3000/api/v1/tracking?carrier=all&equipmentReference=APZU4812090"
```

---

## 요약

**현재 상황은 정상입니다!** 

- **HMM**: 파라미터 없이 호출하면 에러가 나는 것이 정상
- **ZIM, CMA CGM, Maersk**: `.env` 파일에 API Key/인증 정보를 설정해야 함

**다음 단계**:
1. `.env` 파일 생성 및 API Key 설정
2. 서버 재시작
3. 올바른 파라미터로 API 호출

