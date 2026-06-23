# Deploy & Version Tracking Skill

## 설명
코드 수정 완료 후 버전 기록 + 배포를 통합 관리하는 스킬.
**모든 기능 변경 시 반드시 이 스킬의 절차를 따를 것.**

## 트리거 조건
- 파일 수정(Edit, Write) 작업이 완료된 후
- 코드 변경이 발생한 경우
- 사용자가 "배포", "버전업", "커밋" 등을 요청한 경우

---

## 1단계: 버전 문서 업데이트 (필수)

코드 변경 완료 시 **반드시 아래 3개 파일을 업데이트**:

### 1-1. version-archive.md (버전 히스토리)
```
파일: .claude/skills/version-archive.md
```
- "현재 버전 히스토리" 테이블에 새 행 추가
- 형식: `| v{버전} | {변경 설명} | {날짜 YYYY-MM-DD} |`
- "주요 전환점 메모"에 구조 변경이면 추가
- 버전 규칙:
  - major 올림: 화면 구조 변경, 큰 기능 추가
  - minor 올림: 기존 기능 수정, 버그 수정, 데이터 변경

### 1-2. screen-structure.md (화면 구조)
```
파일: .claude/skills/screen-structure.md
```
- 컴포넌트 추가/제거/변경 시 "컴포넌트 목록" 업데이트
- 레이아웃 변경 시 "레이아웃 구성" 다이어그램 업데이트
- 새 데이터 흐름이 있으면 "데이터 흐름" 업데이트
- 버전 번호 표기 업데이트 (파일 상단)

### 1-3. project-context.md (프로젝트 컨텍스트)
```
파일: .claude/skills/project-context.md
```
- "현재 버전" 업데이트
- 조회조건/화면플로우 변경 시 해당 섹션 업데이트
- 새 도메인 용어가 생기면 추가
- Mock 데이터 변경 시 "Mock 데이터 현황" 업데이트

---

## 2단계: 배포 여부 확인

문서 업데이트 완료 후 사용자에게 질문:

> "v{버전} 문서 업데이트 완료. GitHub 커밋 및 Vercel 배포를 진행할까요?"

---

## 3단계: 배포 프로세스

사용자가 승인하면 순서대로 진행:

1. **Git 상태 확인**
   ```bash
   git status
   ```

2. **변경사항 커밋**
   ```bash
   git add <수정된 파일>
   git commit -m "<type>: <설명> (v{버전})"
   ```

3. **GitHub Push**
   ```bash
   git push origin main
   ```

4. **Vercel 배포**
   ```bash
   vercel --prod --yes
   ```

5. **배포 URL 안내**
   - Production URL: https://aia-replenishment.vercel.app

## 커밋 메시지 규칙
- `feat:` 새로운 기능 추가
- `fix:` 버그 수정
- `refactor:` 코드 리팩토링
- `style:` UI/스타일 변경
- `docs:` 문서 수정
- `chore:` 기타 변경사항
- 반드시 뒤에 `(v{버전})` 포함

## 주의사항
- **1단계(문서 업데이트)는 배포 여부와 무관하게 항상 실행**
- 사용자가 배포를 원하지 않아도 문서는 반드시 업데이트
- 배포 실패 시 에러 내용을 명확히 안내
