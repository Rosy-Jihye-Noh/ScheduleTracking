# 다음 단계 및 TO-DO 리스트

## 🔐 API Key 및 토큰 설정 방법

### 환경 변수 파일 (.env)

**프로젝트 루트에 `.env` 파일을 생성**하고 다음 형식으로 작성하세요:

```env
# ============================================
# 선사별 API 인증 정보
# ============================================

# CMA CGM (OAuth2)
CMCG_CLIENT_ID=your_cma_cgm_client_id_here
CMCG_CLIENT_SECRET=your_cma_cgm_client_secret_here

# HMM (API Key - 엔드포인트별로 다른 키 사용)
# 각 엔드포인트별로 다른 토큰을 발급받습니다
HMM_API_KEY_SCHEDULE=your_hmm_schedule_api_key_here      # Vessel Schedule용
HMM_API_KEY_TRACKING=your_hmm_tracking_api_key_here      # Track and Trace용
HMM_API_KEY_PORT_SCHEDULE=your_hmm_port_schedule_api_key_here  # Port Schedule용 (선택)
# 기본 API Key (fallback)
HMM_API_KEY=your_hmm_api_key_here

# ZIM (API Key)
ZIM_API_KEY=your_zim_api_key_here

# Maersk (OAuth2 + API Key)
MAERSK_CLIENT_ID=your_maersk_client_id_here
MAERSK_CLIENT_SECRET=your_maersk_client_secret_here
MAERSK_API_KEY=your_maersk_api_key_here

# ============================================
# 애플리케이션 설정
# ============================================
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

### 중요 사항

1. **`.env` 파일은 절대 Git에 커밋하지 마세요!** (이미 .gitignore에 포함됨)
2. **환경 변수 이름 규칙**:
   - OAuth2: `{CARRIER_CODE}_CLIENT_ID`, `{CARRIER_CODE}_CLIENT_SECRET`
   - API Key: `{CARRIER_CODE}_API_KEY`
   - Carrier Code는 대문자 (CMCG, HMM, ZIM, MAERSK)
3. **각 선사 포털에서 발급받은 실제 값으로 교체**하세요

---

## 📋 최적의 TO-DO 리스트 (우선순위 순)

### 🔴 Phase 5: 필수 인프라 구축 (즉시 필요)

#### 5.1 환경 변수 설정 가이드

- [X] `.env.example` 파일 생성 (완료)
- [X] `.env.example` 파일에 모든 선사 인증 정보 템플릿 추가
- [X] README.md에 환경 변수 설정 가이드 추가
- [X] 각 선사별 API Key 발급 방법 링크 추가

#### 5.2 로깅 시스템 구현

- [X] `src/infrastructure/logger/Logger.ts` 구현
  - Winston 기반 구조화된 로깅
  - 로그 레벨 관리 (info, warn, error, debug)
  - 파일 로깅 및 콘솔 로깅
  - 선사별 요청/응답 로깅
- [X] 모든 어댑터에 로깅 추가
- [X] API 컨트롤러에 요청/응답 로깅 추가

#### 5.3 기본 검증 및 테스트

- [X] 프로젝트 빌드 테스트 (`npm run build`)
- [X] TypeScript 컴파일 에러 확인 및 수정
- [X] 기본 서버 실행 테스트 (`npm run dev`)
- [ ] Health check 엔드포인트 테스트
- [ ] 각 선사 어댑터 초기화 테스트

---

### 🟡 Phase 6: 핵심 기능 개선 (단기)

#### 6.1 에러 처리 개선

- [X] `src/infrastructure/error/ErrorHandler.ts` 구현
  - 선사별 에러 분류
  - 재시도 로직 (RetryHandler)
  - 타임아웃 처리
- [X] API 응답 에러 형식 표준화
- [X] 에러 로깅 개선

#### 6.2 입력 검증 강화

- [ ] `src/api/middleware/validation.ts` 구현
  - 쿼리 파라미터 검증 (Joi 또는 class-validator)
  - 날짜 형식 검증
  - UN Location Code 검증
  - IMO Number 검증
- [ ] 에러 메시지 개선

#### 6.3 API 응답 개선

- [ ] 응답 형식 표준화
- [ ] Pagination 메타데이터 개선
- [ ] 선사별 응답 시간 측정 및 반환

---

### 🟢 Phase 7: 고급 기능 (중기)

#### 7.1 캐싱 전략

- [ ] `src/infrastructure/cache/CacheManager.ts` 구현
  - Redis 또는 메모리 캐시
  - 선사별 API 응답 캐싱
  - TTL 설정
  - 캐시 무효화 전략

#### 7.2 성능 최적화

- [ ] 요청 병렬 처리 최적화
- [ ] 타임아웃 설정 최적화
- [ ] 연결 풀 관리

#### 7.3 모니터링 및 메트릭

- [ ] 요청 수, 응답 시간 메트릭
- [ ] 선사별 성공/실패율 추적
- [ ] Health check 개선 (각 선사 상태 확인)

---

### 🔵 Phase 8: 문서화 및 배포 (장기)

#### 8.1 API 문서화

- [ ] Swagger/OpenAPI 문서 생성
- [ ] API 사용 예시 추가
- [ ] 에러 코드 문서화

#### 8.2 테스트 코드

- [ ] 단위 테스트 (각 어댑터)
- [ ] 통합 테스트 (API 엔드포인트)
- [ ] Mapper 테스트

#### 8.3 배포 준비

- [ ] Docker 설정
- [ ] 환경별 설정 분리 (dev, staging, prod)
- [ ] CI/CD 파이프라인

---

## 🎯 즉시 시작 가능한 작업 (우선순위)

### 1순위: 환경 변수 설정 및 기본 실행

```
1. .env 파일 생성 및 API Key 입력
2. npm install 실행
3. npm run build 테스트
4. npm run dev로 서버 실행
5. Health check 확인
```

### 2순위: 로깅 시스템 구현

```
1. Logger.ts 구현
2. 어댑터에 로깅 추가
3. API 요청/응답 로깅
```

### 3순위: 기본 검증

```
1. 입력 파라미터 검증
2. 에러 처리 개선
3. 실제 API 호출 테스트
```

---

## 📝 환경 변수 상세 가이드

### CMA CGM

```env
CMCG_CLIENT_ID=your_client_id
CMCG_CLIENT_SECRET=your_client_secret
```

- 발급 방법: [CMA CGM API Portal](https://api-portal.cma-cgm.com/)
- 인증 방식: OAuth2 Client Credentials

### HMM

```env
HMM_API_KEY=your_api_key
```

- 발급 방법: HMM API Gateway 포털
- 인증 방식: API Key (x-Gateway-APIKey 헤더)

### ZIM

```env
ZIM_API_KEY=your_api_key
```

- 발급 방법: ZIM API 포털
- 인증 방식: API Key (x-Gateway-APIKey 헤더)

### Maersk

```env
MAERSK_CLIENT_ID=your_client_id
MAERSK_CLIENT_SECRET=your_client_secret
MAERSK_API_KEY=your_api_key  # 선택사항
```

- 발급 방법: [Maersk Developer Portal](https://developer.maersk.com/)
- 인증 방식: OAuth2 + API Key (둘 다 지원)

---

## ⚠️ 주의사항

1. **보안**: `.env` 파일은 절대 공유하거나 Git에 커밋하지 마세요
2. **환경 변수 이름**: Carrier Code는 정확히 일치해야 합니다 (대소문자 구분)
3. **API Key 발급**: 각 선사 포털에서 실제 API Key를 발급받아야 합니다
4. **테스트 환경**: 가능하면 Sandbox/Test 환경의 API Key를 먼저 사용하세요

---

## 🚀 빠른 시작 체크리스트

- [ ] `.env` 파일 생성
- [ ] 각 선사 API Key/토큰 입력
- [ ] `npm install` 실행
- [ ] `npm run build` 성공 확인
- [ ] `npm run dev`로 서버 실행
- [ ] `GET /health` 엔드포인트 테스트
- [ ] `GET /api/v1/schedules?carrier=all` 테스트
