'use client';

// API 테스트 페이지 — 필터 없이 각 API를 직접 호출하고 응답을 확인
// http://localhost:3000/test-api

import { useState } from 'react';

interface TestResult {
  name: string;
  status: number | 'error';
  time: number;
  data: unknown;
}

const MOCK_OPTIMIZE_BODY = {
  brandCd: 'X',
  ssnCd: '26S',
  prodCd: 'DMWJC2063',
  colorCd: 'BKS',
  executionDate: new Date().toISOString().slice(0, 10),
  warehouseStock: [
    { sizCd: '90', qty: 85 },
    { sizCd: '95', qty: 240 },
    { sizCd: '100', qty: 310 },
    { sizCd: '105', qty: 180 },
    { sizCd: '110', qty: 60 },
  ],
  targetShops: [
    {
      shopCd: '10018',
      shopNm: '롯데잠실',
      adjRank: 1,
      currentStock: [
        { sizCd: '90', qty: 2 },
        { sizCd: '95', qty: 5 },
        { sizCd: '100', qty: 3 },
        { sizCd: '105', qty: 1 },
        { sizCd: '110', qty: 0 },
      ],
    },
    {
      shopCd: '10050',
      shopNm: '롯데본점',
      adjRank: 2,
      currentStock: [
        { sizCd: '90', qty: 1 },
        { sizCd: '95', qty: 3 },
        { sizCd: '100', qty: 2 },
        { sizCd: '105', qty: 0 },
        { sizCd: '110', qty: 1 },
      ],
    },
    {
      shopCd: '10070',
      shopNm: '신세계강남',
      adjRank: 3,
      currentStock: [
        { sizCd: '90', qty: 0 },
        { sizCd: '95', qty: 2 },
        { sizCd: '100', qty: 4 },
        { sizCd: '105', qty: 2 },
        { sizCd: '110', qty: 0 },
      ],
    },
  ],
};

export default function TestApiPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimizeBody, setOptimizeBody] = useState(
    JSON.stringify(MOCK_OPTIMIZE_BODY, null, 2),
  );

  async function runTest(name: string, fetchFn: () => Promise<Response>) {
    const start = Date.now();
    try {
      const res = await fetchFn();
      const data = await res.json();
      return { name, status: res.status, time: Date.now() - start, data };
    } catch (err) {
      return {
        name,
        status: 'error' as const,
        time: Date.now() - start,
        data: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function runAll() {
    setLoading(true);
    setResults([]);
    const tests: TestResult[] = [];

    // 1. dropdowns
    tests.push(await runTest('GET /api/dropdowns?brandCd=X', () => fetch('/api/dropdowns?brandCd=X')));
    setResults([...tests]);

    // 2. product-tree
    tests.push(await runTest('GET /api/product-tree?brandCd=X (스타일 수만 확인)', async () => {
      const res = await fetch('/api/product-tree?brandCd=X');
      return res;
    }));
    setResults([...tests]);

    // 3. shop-grp
    const grpNo = 'XSHGR202512100000003546';
    tests.push(await runTest(`GET /api/shop-grp?shopGrpNo=${grpNo}`, () => fetch(`/api/shop-grp?shopGrpNo=${grpNo}`)));
    setResults([...tests]);

    // 4. forecast
    tests.push(await runTest('GET /api/forecast', () =>
      fetch('/api/forecast?brandCd=X&prodCd=DMWJC2063&colorCd=BKS&ssnCd=26S&executionDate=2026-04-27'),
    ));
    setResults([...tests]);

    // 5. warehouse-stock
    tests.push(await runTest('GET /api/warehouse-stock (mock)', () => fetch('/api/warehouse-stock?brandCd=X&prodCd=DMWJC2063&colorCd=BKS&apCd=U100')));
    setResults([...tests]);

    // 6. shop-stock
    tests.push(await runTest('GET /api/shop-stock (mock)', () => fetch('/api/shop-stock?brandCd=X&prodCd=DMWJC2063&colorCd=BKS&shopCds=10018,10050,10070')));
    setResults([...tests]);

    setLoading(false);
  }

  async function runOptimize() {
    setLoading(true);
    let body: unknown;
    try {
      body = JSON.parse(optimizeBody);
    } catch {
      setResults([{ name: 'POST /api/optimize', status: 'error', time: 0, data: 'JSON 파싱 실패 — body를 확인하세요' }]);
      setLoading(false);
      return;
    }

    const result = await runTest('POST /api/optimize (ILP)', () =>
      fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    setResults((prev) => [...prev, result]);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-lg font-bold text-[#1B3A5C] mb-1">API 테스트 페이지</h1>
        <p className="text-xs text-[#718096] mb-4">
          각 API 엔드포인트를 직접 호출하고 응답을 확인합니다. 배포 없이 로컬에서 테스트 가능.
        </p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={runAll}
            disabled={loading}
            className="h-9 px-4 text-xs rounded-lg bg-[#00B4D8] text-white hover:bg-[#0096B4] disabled:opacity-40"
          >
            전체 API 테스트 (mock)
          </button>
          <button
            onClick={runOptimize}
            disabled={loading}
            className="h-9 px-4 text-xs rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#9F7AEA] text-white disabled:opacity-40"
          >
            POST /api/optimize 실행 (ILP)
          </button>
          <button
            onClick={() => setResults([])}
            className="h-9 px-4 text-xs rounded-lg border border-[#D2D8E0] bg-white hover:bg-[#F7F9FC]"
          >
            결과 초기화
          </button>
        </div>

        {/* Optimize Body Editor */}
        <div className="bg-white border border-[#D2D8E0] rounded-md p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-[#1B3A5C]">POST /api/optimize 요청 Body</span>
            <button
              onClick={() => setOptimizeBody(JSON.stringify(MOCK_OPTIMIZE_BODY, null, 2))}
              className="text-[10px] text-[#00B4D8] hover:underline"
            >
              기본값 복원
            </button>
          </div>
          <textarea
            value={optimizeBody}
            onChange={(e) => setOptimizeBody(e.target.value)}
            className="w-full h-[280px] p-3 text-xs font-mono border border-[#D2D8E0] rounded bg-[#F8F9FB] resize-y"
            spellCheck={false}
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[13px] font-semibold text-[#1B3A5C]">테스트 결과</h2>
            {results.map((r, i) => (
              <div key={i} className="bg-white border border-[#D2D8E0] rounded-md overflow-hidden">
                <div className="px-4 py-2 border-b border-[#EDEFF2] flex items-center gap-3 bg-[#F8F9FB]">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    r.status === 200
                      ? 'bg-[#E6F4EA] text-[#2F855A]'
                      : r.status === 'error'
                        ? 'bg-[#FEE2E2] text-[#DC3545]'
                        : 'bg-[#FFF3CD] text-[#92400E]'
                  }`}>
                    {r.status}
                  </span>
                  <span className="text-xs font-medium text-[#1B3A5C]">{r.name}</span>
                  <span className="text-[10px] text-[#A0AEC0] ml-auto">{r.time}ms</span>
                </div>
                <pre className="p-4 text-[11px] font-mono text-[#4A5568] overflow-auto max-h-[300px] whitespace-pre-wrap">
                  {typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-[3px] border-[#E2E8F0] border-t-[#7C3AED] rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-[#A0AEC0]">요청 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}
