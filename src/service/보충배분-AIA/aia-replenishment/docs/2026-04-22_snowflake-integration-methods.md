# Snowflake 실시간 연동 방식 비교 분석

> 작성일: 2026-04-22
> 목적: 보충배분-AIA 조회조건 데이터를 Snowflake와 연결하는 방법 비교
> 현재 상태: JSON 스냅샷 방식 (수동 1회 실행)

---

## 0. 핵심 결론

> **현재 방식(JSON 스냅샷 + 일배치)이 F&F 환경에 가장 적합합니다.**
>
> 드롭다운 데이터(브랜드 5개, 시즌 15개, 배분그룹 273개)는 시즌 단위로 변경되며,
> 스타일 카탈로그 69K행도 하루 한 번 갱신이면 충분합니다.
> 실시간 연결 방식들은 **사내망 Snowflake 접근 불가** 또는 **과도한 인프라 복잡도** 문제로 부적합합니다.

---

## 1. F&F 환경 제약 조건

| 제약 | 내용 | 영향 |
|------|------|------|
| Snowflake 위치 | 사내망 (`cixxjbf-wp67697`) | 인터넷에서 직접 TCP 연결 불가 |
| 인증 방식 | SSO (externalbrowser) | 서버사이드/자동화에서 사용 불가 |
| 배포 위치 | Vercel (공개 인터넷) | 사내망 리소스에 접근 불가 |
| 데이터 규모 | 브랜드 5, 시즌 15, 스타일 69K, 배분그룹 273 | 일배치로 충분한 규모 |
| 데이터 변경 빈도 | 시즌 단위 (월~분기) | 실시간 갱신 불필요 |

---

## 2. 7가지 방식 상세 분석

### 방식 A: JSON 스냅샷 + 일배치 (현재 방식)

```
[사내망 PC/서버]
  sync_snowflake.py 실행 (SSO 로그인)
      ↓
  Snowflake 쿼리 → JSON 파일 생성
      ↓
  git commit + push → Vercel 자동 배포
      ↓
[Vercel] 정적 JSON 서빙 → 드롭다운 표시
```

| 항목 | 평가 |
|------|------|
| 구현 난이도 | **하** (이미 구현 완료) |
| 데이터 신선도 | 배치 (일 1회) |
| Vercel 호환성 | 완벽 (정적 파일) |
| 사내망 접근 | 가능 (스크립트가 사내에서 실행) |
| 인증 | SSO 사용 가능 |
| 추가 비용 | 없음 |
| 장점 | 단순, 안정적, 장애 격리 (SF 다운 시에도 어제 데이터로 동작) |
| 단점 | 데이터 최대 24시간 지연, git에 JSON 이력 누적 |

---

### 방식 B: Next.js API Route + snowflake-sdk 직접 쿼리

```
[브라우저] → fetch('/api/brands')
    → [Vercel Serverless Function]
        → snowflake-sdk 연결
            → [Snowflake 사내망] ← ❌ 방화벽 차단
```

| 항목 | 평가 |
|------|------|
| 구현 난이도 | 중 |
| 데이터 신선도 | 실시간 |
| **사내망 접근** | **❌ 불가** — Vercel에서 사내망 IP 접근 불가 |
| 인증 | SSO 불가, Key Pair JWT 필요 |
| Cold Start | 심각 — snowflake-sdk 연결에 3~10초 소요 |
| 추가 비용 | Vercel 함수 실행 시간 + Snowflake 컴퓨팅 |

**판정: ❌ 사내망 환경에서 물리적으로 불가능**

---

### 방식 C: Snowpark Container Services (SPCS) REST API

```
[Vercel Next.js]
    → HTTPS 호출
        → [SPCS 공개 엔드포인트 (xxx.snowflakecomputing.app)]
            → Snowflake 내부 네트워크에서 데이터 조회
```

| 항목 | 평가 |
|------|------|
| 구현 난이도 | **상** (Docker 컨테이너, SPCS 설정, 운영) |
| 데이터 신선도 | 실시간 |
| 사내망 접근 | 가능 (SPCS가 Snowflake 내부에서 실행) |
| 인증 | PAT (Programmatic Access Token, 2025.04 GA) |
| 추가 비용 | **상** — SPCS 컨테이너 상시 실행 크레딧 |
| 장점 | 실시간, Snowflake 내부 보안 |
| 단점 | 드롭다운 273개를 위해 Docker 컨테이너 운영은 과투자 |

**판정: ⚠️ 기술적으로 가능하나 과도한 엔지니어링**

---

### 방식 D: Vercel Edge Function + Snowflake SQL REST API

```
[브라우저]
    → [Vercel Edge Function]
        → HTTPS POST /api/v2/statements
            → [Snowflake SQL REST API] ← ❌ 사내망이면 접근 불가
```

| 항목 | 평가 |
|------|------|
| 구현 난이도 | 중 (JWT 생성, REST 호출) |
| 데이터 신선도 | 실시간 |
| **사내망 접근** | **❌ 불가** — SQL REST API 엔드포인트가 사내망에 있으면 접근 불가 |
| 인증 | Key Pair JWT 또는 PAT |
| 장점 | 경량, Edge Runtime 호환 |
| 단점 | Snowflake가 인터넷에 노출되어야 사용 가능 |

**판정: ❌ 사내망 환경에서 불가능** (인터넷 노출 Snowflake라면 최적의 경량 방식)

---

### 방식 E: 중간 DB 캐시 (Supabase/PlanetScale 동기화)

```
[사내 배치 스크립트]
    → Snowflake 쿼리
        → Supabase PostgreSQL (인터넷 노출)
            ← [Vercel API Route] → supabase-js 호출
                → 드롭다운
```

| 항목 | 평가 |
|------|------|
| 구현 난이도 | 중 (동기화 파이프라인 구성) |
| 데이터 신선도 | 준실시간 (동기화 주기에 따라) |
| 사내망 접근 | 가능 (동기화 스크립트가 사내에서 실행) |
| 추가 비용 | Supabase Free tier 충분 |
| 장점 | 서버리스 친화적, 빠른 응답 |
| 단점 | 현재 JSON 방식 대비 장점이 미미, 관리 포인트 추가 |

**판정: ⚠️ 가능하나 현재 규모에서 JSON 대비 장점 부족**

---

### 방식 F: Streamlit in Snowflake (SiS)

```
[Snowflake 내부]
    → SiS 앱 (Python + 데이터 직접 접근)
        → 독립 URL로 서빙
            → 브라우저 (SSO 로그인 필요)
```

| 항목 | 평가 |
|------|------|
| 구현 난이도 | 하~중 |
| 데이터 신선도 | 실시간 |
| **Vercel/Next.js 통합** | **❌ 불가** — 독립 앱으로만 동작 |
| 장점 | Snowflake 내부 실행, SSO 사용 가능 |
| 단점 | 기존 Next.js 화면과 통합 불가 |

**판정: ❌ Next.js 드롭다운 바인딩 목적에 부적합**

---

### 방식 G: AWS Lambda + API Gateway

```
[사내 VPC - Direct Connect/VPN]
    → [AWS Lambda] (사내 VPC 배치)
        → snowflake-sdk → Snowflake (사내망)
    ← [API Gateway] (인터넷 노출)
        ← [Vercel Next.js] fetch()
            → 드롭다운
```

| 항목 | 평가 |
|------|------|
| 구현 난이도 | **상** (VPC, Lambda, API Gateway, Direct Connect) |
| 데이터 신선도 | 실시간 |
| 사내망 접근 | 가능 (Direct Connect/VPN 경유) |
| 추가 비용 | **상** — AWS Lambda + API Gateway + Direct Connect |
| 장점 | 사내망 접근 + 인터넷 노출 가능 |
| 단점 | 드롭다운 용도로 심각한 과투자, 인프라 복잡도 최상 |

**판정: ❌ 드롭다운 바인딩 목적에 과도한 구성**

---

## 3. 종합 비교표

| 방식 | 난이도 | 신선도 | 사내망 | 비용 | Vercel 호환 | **F&F 적합성** |
|------|--------|--------|--------|------|------------|--------------|
| **A. JSON 스냅샷** | 하 | 배치(일) | ✅ | 없음 | ✅ | **★★★★★** |
| B. API Route + SDK | 중 | 실시간 | ❌ | 중 | △ | ✘ |
| C. SPCS REST API | 상 | 실시간 | ✅ | 상 | ✅ | ★★☆☆☆ |
| D. Edge + SQL REST | 중 | 실시간 | ❌ | 중 | ✅ | ✘ |
| E. 중간 DB 캐시 | 중 | 준실시간 | ✅ | 소 | ✅ | ★★★☆☆ |
| F. Streamlit in SF | 하 | 실시간 | ✅ | 중 | ❌ | ✘ |
| G. Lambda + APIGW | 상 | 실시간 | ✅ | 상 | ✅ | ★☆☆☆☆ |

---

## 4. 최종 권고

### 단기 (현재 ~ 운영 전): 방식 A 개선

현재 방식을 유지하되 **자동화**만 추가:

```
[사내망 PC에 GitHub Actions Self-hosted Runner 설치]
    ↓ 매일 새벽 6시 cron
    ↓ sync_snowflake.py 자동 실행
    ↓ JSON 갱신 → git push → Vercel 자동 배포
```

필요 작업:
1. IT팀에 Snowflake 서비스 계정 발급 요청 (SSO 대신 비밀번호 인증)
2. 사내 PC/서버에 GitHub Actions Self-hosted Runner 설치
3. `.github/workflows/sync-snowflake.yml` 작성

### 중기 (운영 안정화 후): git 이력 문제 해결

JSON 파일이 git에 쌓이는 문제 해결:
- **Vercel Blob Storage**에 JSON 업로드 → Next.js ISR로 주기적 fetch
- git에는 JSON을 커밋하지 않음
- 배포와 데이터 갱신 분리

### 장기 (실시간 필요 시): 방식 C 또는 E 검토

배분그룹이나 스타일 카탈로그가 하루 중에도 자주 바뀌는 운영 패턴이 확인되면:
- **방식 E (Supabase)**: 가장 가성비 좋은 준실시간 옵션
- **방식 C (SPCS)**: Snowflake 생태계 안에서 완결되는 실시간 옵션

---

## 5. 핵심 판단 기준

> "드롭다운에 5개 브랜드, 15개 시즌, 273개 배분그룹을 보여주기 위해
> Docker 컨테이너를 운영하거나 AWS Direct Connect를 구축하는 것은
> 망치로 모기를 잡는 것과 같습니다."
>
> 데이터 변경 빈도와 사내망 제약을 고려하면,
> **가장 단순한 방식이 가장 올바른 방식**입니다.

---

*이 문서는 Snowflake SQL REST API, SPCS, Vercel Edge Function 등 2025년 최신 기술을 조사하여 작성되었습니다.*
