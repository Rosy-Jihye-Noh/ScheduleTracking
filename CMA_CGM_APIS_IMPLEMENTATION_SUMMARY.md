# CMA CGM Schedule APIs 구현 완료 요약

## ✅ 구현 완료

CMA CGM의 3가지 Schedule API를 성공적으로 구현했습니다:

1. ✅ **Proforma API** (`vesseloperation.proforma.v2`) - Lines & Services
2. ✅ **Voyage API** (`vesseloperation.voyage.v2`) - Voyages
3. ✅ **Route API** (`vesseloperation.route.v2`) - Routing Finder

---

## 📁 생성된 파일

### Adapter 클래스
1. `src/adapters/carriers/cma-cgm/CMACGMProformaAdapter.ts`
   - 서비스/라인 정보 조회
   - Zone 기반 서비스 검색
   - 서비스 Fleet 및 Proforma Calls 조회

2. `src/adapters/carriers/cma-cgm/CMACGMVoyageAdapter.ts`
   - 항해 정보 조회
   - 선박 스케줄 조회
   - Commercial Calls 검색

3. `src/adapters/carriers/cma-cgm/CMACGMRouteAdapter.ts`
   - 포트 간 라우팅 조회
   - 스케줄 및 Cut-off 정보 제공

### 업데이트된 파일
1. `src/adapters/carriers/cma-cgm/CMACGMAdapter.ts`
   - 자동 API 선택 로직 구현
   - 파라미터 기반 라우팅

2. `config/carriers/cma-cgm.json`
   - 새로운 API 엔드포인트 추가
   - 인증 설정 추가

3. `src/infrastructure/config/ConfigLoader.ts`
   - 새로운 API 타입 지원 추가

4. `src/adapters/http/HttpClient.ts`
   - 새로운 엔드포인트 타입 인식 추가

5. `src/api/controllers/ScheduleController.ts`
   - 새로운 파라미터 지원 추가

---

## 🏗️ 구조 설계

### API 선택 우선순위

`CMACGMAdapter.getSchedule()` 메서드는 파라미터에 따라 자동으로 적절한 API를 선택합니다:

```
1. Route API (최우선)
   조건: placeOfLoading/unLocodePlaceOfLoading + placeOfDischarge/unLocodePlaceOfDischarge
   
2. Voyage API
   조건: voyageCode, vesselIMO, (from + to), portCode, countryCode 중 하나 이상
   
3. Proforma API
   조건: serviceCode, lineCode, (zoneFromCode + zoneToCode) 중 하나 이상
   
4. Commercial Schedule API (기본값)
   조건: 위 조건들이 모두 없을 때
```

---

## 🔧 사용 방법

### Proforma API

```bash
# 서비스 코드로 조회
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&serviceCode=FAL"

# Zone으로 서비스 검색
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&zoneFromCode=ASIE&zoneToCode=WEUR"
```

### Voyage API

```bash
# 항해 코드로 조회
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&voyageCode=0PFECE1MA"

# 선박 IMO로 현재 스케줄 조회
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&vesselIMO=9839179"

# 날짜 범위로 항해 검색
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&from=2025-01-01&to=2025-01-31"
```

### Route API

```bash
# 포트 간 라우팅 조회 (UN/Locode 사용)
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM"

# 출발 날짜 지정
curl "http://localhost:3000/api/v1/schedules?carrier=cma-cgm&unLocodePlaceOfLoading=CNSGH&unLocodePlaceOfDischarge=NLRTM&departureDate=2025-01-15"
```

---

## ⚠️ 현재 상태

### 테스트 결과

모든 API 호출에서 **403 Forbidden** 에러가 발생했습니다:
```
{"message":"You cannot consume this service"}
```

### 원인 분석

1. **API 구독 상태**: Free Trial/Pilot 상태에서는 이 API들을 사용할 수 없을 수 있음
2. **API Key 권한**: 현재 API Key가 이 API들에 대한 권한이 없을 수 있음
3. **구독 필요**: 각 API에 대한 별도 구독이 필요할 수 있음

### 해결 방법

1. **CMA CGM API Portal 확인**
   - 각 API의 구독 상태 확인
   - Free Trial에서 사용 가능한 API 목록 확인
   - API Key의 권한 범위 확인

2. **API Key 확인**
   - `.env` 파일에 `CMCG_API_KEY`가 올바르게 설정되어 있는지 확인
   - API Key가 Proforma, Voyage, Route API에 대한 권한이 있는지 확인

3. **구독 신청**
   - API Portal에서 각 API에 대한 구독 신청
   - 구독 승인 대기

---

## 📊 구현 상세

### 1. Proforma Adapter

**지원 엔드포인트:**
- `GET /services/{serviceCode}` - 서비스 코드로 조회
- `GET /services` - 서비스 검색
- `GET /lines/{lineCode}` - 라인 코드로 조회
- `GET /lines` - 라인 검색
- `GET /zones/{zoneFromCode}/zones/{zoneToCode}/services` - Zone 기반 검색
- `GET /services/{serviceCode}/fleet` - 서비스 Fleet 조회 (별도 메서드)
- `GET /services/{serviceCode}/proformacalls` - 서비스 Proforma Calls 조회 (별도 메서드)

**주요 기능:**
- 서비스/라인 정보 조회
- Zone 기반 서비스 검색
- 다양한 필터 옵션 (포트, 터미널, 선박 IMO 등)

### 2. Voyage Adapter

**지원 엔드포인트:**
- `GET /commercialVoyages/{voyageCode}` - 항해 코드로 조회
- `GET /commercialVoyages` - 항해 검색
- `GET /vessels/{vesselIMO}/schedule` - 선박 현재 스케줄 조회
- `GET /commercialCalls` - Commercial Calls 검색
- `GET /commercialCalls/{callId}` - 콜 ID로 조회 (별도 메서드로 구현 가능)

**주요 기능:**
- 항해 정보 조회
- 선박 스케줄 조회
- 포트/국가 코드로 콜 검색
- 날짜 범위 필터링

### 3. Route Adapter

**지원 엔드포인트:**
- `GET /routings` - 포트 간 라우팅 조회

**주요 기능:**
- 포트 간 라우팅 및 스케줄 조회
- CMA CGM 코드 또는 UN/Locode 지원
- 출발/도착 날짜 지정
- 특정 선박/서비스로 제한
- 환경 발자국 정보 제공

---

## 🔄 데이터 변환

모든 Adapter는 CMA CGM의 Proprietary 응답을 DCSA 표준 `ServiceSchedule[]` 형식으로 변환합니다.

**변환 로직:**
- Proforma: 서비스 정보 → ServiceSchedule
- Voyage: 항해/콜 정보 → ServiceSchedule (VesselSchedule 포함)
- Route: 라우팅 정보 → ServiceSchedule (TransportCall 포함)

---

## 📝 다음 단계

1. **API Portal에서 구독 확인**
   - 각 API의 구독 상태 확인
   - 구독이 필요한 경우 신청

2. **API Key 권한 확인**
   - API Key가 모든 API에 대한 권한이 있는지 확인
   - 필요시 새로운 API Key 발급

3. **테스트**
   - 구독 승인 후 실제 API 호출 테스트
   - 각 API의 다양한 파라미터 조합 테스트

4. **문서화**
   - API별 상세 사용 예시 추가
   - 에러 처리 가이드 추가

---

## 📚 참고 문서

- [CMA CGM API Portal - Schedules](https://api-portal.cma-cgm.com/products/schedules)
- [구현 가이드](./CMA_CGM_SCHEDULE_APIS_GUIDE.md)

---

## ✅ 구현 체크리스트

- [x] Proforma API Adapter 구현
- [x] Voyage API Adapter 구현
- [x] Route API Adapter 구현
- [x] Config 파일 업데이트
- [x] ConfigLoader 타입 업데이트
- [x] HttpClient 엔드포인트 타입 인식 추가
- [x] CMACGMAdapter API 선택 로직 구현
- [x] ScheduleController 파라미터 지원 추가
- [x] 데이터 변환 로직 구현
- [x] 문서화

**구현 완료!** 🎉

