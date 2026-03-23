# Deploy Prompt Skill

## 설명
코드 수정 작업 완료 후 배포 여부를 사용자에게 확인하는 스킬

## 트리거 조건
- 파일 수정(Edit, Write) 작업이 완료된 후
- 코드 변경이 발생한 경우

## 동작
코드 수정이 완료되면 항상 다음 질문을 사용자에게 제시:

> "수정이 완료되었습니다. GitHub 커밋 및 Vercel 배포를 진행할까요?"

## 배포 프로세스
사용자가 승인하면 다음 순서로 진행:

1. **Git 상태 확인**
   ```bash
   git status
   ```

2. **변경사항 커밋**
   ```bash
   git add <수정된 파일>
   git commit -m "<커밋 메시지>"
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
- feat: 새로운 기능 추가
- fix: 버그 수정
- refactor: 코드 리팩토링
- style: UI/스타일 변경
- docs: 문서 수정
- chore: 기타 변경사항

## 주의사항
- 사용자가 배포를 원하지 않으면 강제하지 않음
- 배포 실패 시 에러 내용을 명확히 안내
