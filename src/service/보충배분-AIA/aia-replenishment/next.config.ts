import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// ── 프로젝트 루트 강제 지정 ─────────────────────────────────────────
// 한국어+공백 폴더명("1차 화면 초안") + 유저 홈 디렉터리에 package.json 이 있을 때
// Next.js 16 / Turbopack 이 워크스페이스 루트를 /Users/<user> 로 잘못 잡는
// 이슈 방어. 환경(CJS/ESM)에 상관없이 루트 경로를 결정한다.
const projectRoot: string = (() => {
  if (typeof __dirname !== "undefined") return __dirname;
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
})();

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
