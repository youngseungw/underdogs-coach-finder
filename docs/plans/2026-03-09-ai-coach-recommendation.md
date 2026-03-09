# AI Coach Recommendation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 툴바의 "✨ AI 추천" 버튼 클릭 → 자연어 입력 모달 → Claude API가 의도 추출 → 기존 필터 엔진 + 부스트 스코어 적용 → 메인 화면 업데이트 + 각 코치 카드에 추천 이유 표시

**Architecture:** 사용자가 자연어로 필요사항을 입력하면 서버의 `/api/recommend` 엔드포인트가 Claude Haiku API를 호출해 구조화된 필터 파라미터(expertise, industries, roles, freeKeywords)를 추출한다. 클라이언트는 이 파라미터로 기존 `useCoachSearch` 엔진을 실행하고 freeKeywords 보너스 점수를 추가 적용한다. 각 코치 카드에는 매칭된 필드 기반의 추천 이유가 자동 생성되어 표시된다.

**Tech Stack:** React 19, TypeScript, Express, `@anthropic-ai/sdk`, Vite, pnpm, Tailwind CSS, shadcn/ui (Dialog, Textarea, Button)

---

## 환경 준비

### Task 0: 프로젝트 디렉토리 확인 및 환경 변수 설정

**Files:**
- Create: `.env` (프로젝트 루트)

**Step 1: .env 파일 생성**

프로젝트 루트(`underdogs-coach-finder/`)에서:

```bash
# .env 파일 내용
ANTHROPIC_API_KEY=sk-ant-여기에_실제_키_입력
```

> ⚠️ `.gitignore`에 `.env`가 이미 포함되어 있어야 한다. 없다면 추가:
> ```bash
> echo ".env" >> .gitignore
> ```

**Step 2: Anthropic SDK 설치**

```bash
cd /home/udlabs1/underdogs-coach-finder
pnpm add @anthropic-ai/sdk
```

Expected: `@anthropic-ai/sdk` 가 `dependencies`에 추가됨

**Step 3: 확인**

```bash
cat package.json | grep anthropic
```

Expected: `"@anthropic-ai/sdk": "^x.x.x"` 출력

---

## Task 1: 순수 함수 `generateAiReason` 작성 + 테스트

**Files:**
- Create: `client/src/lib/aiReason.ts`
- Create: `client/src/lib/aiReason.test.ts`

**왜 먼저 테스트?** 이 함수는 외부 의존성이 없는 순수 함수라 TDD가 가장 적합하다.

**Step 1: 테스트 파일 작성**

`client/src/lib/aiReason.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateAiReason } from "./aiReason";
import type { Coach } from "@/types/coach";

const mockCoach: Partial<Coach> = {
  id: 1,
  name: "홍길동",
  expertise: ["사업계획서/IR (투자유치/피칭)", "AI/DX (생성형 AI 활용/노코드)"],
  industries: ["IT/소프트웨어"],
  roles: ["VC", "멘토링"],
  intro: "AI 스타트업 투자 전문가",
  career_history: "10년간 VC 투자 경력, AI 스타트업 20개사 투자",
  current_work: "시드 투자사 파트너",
  underdogs_history: "IR 피칭 코칭 5회",
  tools_skills: "",
};

const aiResult = {
  expertise: ["사업계획서/IR (투자유치/피칭)"],
  industries: ["IT/소프트웨어"],
  roles: ["VC"],
  freeKeywords: ["투자경험", "AI스타트업"],
};

describe("generateAiReason", () => {
  it("전문분야 매칭 시 이유에 포함", () => {
    const reason = generateAiReason(mockCoach as Coach, aiResult);
    expect(reason).toContain("IR");
  });

  it("역할 매칭 시 이유에 포함", () => {
    const reason = generateAiReason(mockCoach as Coach, aiResult);
    expect(reason).toContain("VC");
  });

  it("freeKeyword가 career_history에 있으면 이유에 포함", () => {
    const reason = generateAiReason(mockCoach as Coach, aiResult);
    expect(reason.length).toBeGreaterThan(0);
  });

  it("매칭 없으면 빈 문자열 반환", () => {
    const noMatchCoach = {
      ...mockCoach,
      expertise: ["세무개론"],
      industries: ["교육"],
      roles: ["강의"],
      career_history: "",
      intro: "",
    } as Coach;
    const noMatchResult = {
      expertise: ["글로벌코칭"],
      industries: ["헬스케어/바이오"],
      roles: ["글로벌코치"],
      freeKeywords: ["영어"],
    };
    const reason = generateAiReason(noMatchCoach, noMatchResult);
    expect(reason).toBe("");
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

```bash
cd /home/udlabs1/underdogs-coach-finder
npx vitest run client/src/lib/aiReason.test.ts
```

Expected: `aiReason.ts` 없어서 FAIL

**Step 3: 구현 파일 작성**

`client/src/lib/aiReason.ts`:

```typescript
import type { Coach } from "@/types/coach";

export interface AiExtractResult {
  expertise: string[];
  industries: string[];
  roles: string[];
  freeKeywords: string[];
  summary: string;
}

/**
 * 코치 데이터와 AI 추출 결과를 비교해 추천 이유 문자열 생성 (순수 함수)
 */
export function generateAiReason(coach: Coach, ai: AiExtractResult): string {
  const reasons: string[] = [];

  // 전문분야 매칭
  const matchedExpertise = ai.expertise.filter((e) =>
    coach.expertise.some(
      (ce) =>
        ce.toLowerCase().includes(e.toLowerCase().substring(0, 6)) ||
        e.toLowerCase().includes(ce.toLowerCase().substring(0, 6))
    )
  );
  if (matchedExpertise.length > 0) {
    // 괄호 앞까지만 표시 (e.g. "사업계획서/IR")
    const label = matchedExpertise[0].split("(")[0].trim();
    reasons.push(`${label} 전문`);
  }

  // 역할 매칭
  const matchedRoles = ai.roles.filter((r) =>
    coach.roles.some((cr) => cr.includes(r) || r.includes(cr))
  );
  if (matchedRoles.length > 0) {
    reasons.push(matchedRoles.join("/") + " 경험");
  }

  // 업종 매칭
  const matchedIndustries = ai.industries.filter((i) =>
    coach.industries.some(
      (ci) => ci.includes(i) || i.includes(ci)
    )
  );
  if (matchedIndustries.length > 0) {
    reasons.push(matchedIndustries[0] + " 업종");
  }

  // freeKeywords가 코치 텍스트 필드에 있는지 확인
  const coachText = [
    coach.intro,
    coach.career_history,
    coach.current_work,
    coach.underdogs_history,
    coach.tools_skills,
  ]
    .join(" ")
    .toLowerCase();

  const matchedKeywords = ai.freeKeywords.filter((kw) =>
    coachText.includes(kw.toLowerCase())
  );
  if (matchedKeywords.length > 0) {
    reasons.push(`"${matchedKeywords[0]}" 키워드 매칭`);
  }

  return reasons.join(" · ");
}
```

**Step 4: 테스트 재실행하여 통과 확인**

```bash
npx vitest run client/src/lib/aiReason.test.ts
```

Expected: 4 tests PASS

**Step 5: 커밋**

```bash
cd /home/udlabs1/underdogs-coach-finder
git add client/src/lib/aiReason.ts client/src/lib/aiReason.test.ts
git commit -m "feat: add generateAiReason pure function with tests"
```

---

## Task 2: Express 서버에 `/api/recommend` 엔드포인트 추가

**Files:**
- Modify: `server/index.ts`

**Step 1: 현재 서버 코드 확인**

`server/index.ts` 전체를 읽어 현재 구조 파악

**Step 2: 서버 코드 수정**

`server/index.ts` 를 다음으로 교체:

```typescript
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude가 추출해야 할 결과 타입
interface RecommendResult {
  expertise: string[];
  industries: string[];
  roles: string[];
  freeKeywords: string[];
  summary: string;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // AI 추천 엔드포인트
  app.post("/api/recommend", async (req, res) => {
    const { query, availableExpertise, availableIndustries, availableRoles } =
      req.body as {
        query: string;
        availableExpertise: string[];
        availableIndustries: string[];
        availableRoles: string[];
      };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "query is required" });
    }

    try {
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You are a coach recommendation assistant for a Korean startup accelerator program.
Extract structured filter parameters from the user's natural language query.
Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "expertise": string[],    // matching items from availableExpertise
  "industries": string[],   // matching items from availableIndustries
  "roles": string[],        // matching items from availableRoles
  "freeKeywords": string[], // 1-4 important Korean keywords not covered by the above
  "summary": string         // one sentence in Korean summarizing the recommendation intent
}`,
        messages: [
          {
            role: "user",
            content: `Query: "${query}"

Available expertise options: ${availableExpertise.join(", ")}
Available industry options: ${availableIndustries.join(", ")}
Available role options: ${availableRoles.join(", ")}

Return JSON only.`,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      const result: RecommendResult = JSON.parse(content.text);
      return res.json(result);
    } catch (err) {
      console.error("Recommend API error:", err);
      return res.status(500).json({ error: "AI 추천 처리 중 오류가 발생했습니다" });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
```

**Step 3: TypeScript 타입 체크**

```bash
cd /home/udlabs1/underdogs-coach-finder
pnpm check
```

Expected: 에러 없음 (또는 기존 에러만 존재)

**Step 4: 커밋**

```bash
git add server/index.ts
git commit -m "feat: add /api/recommend endpoint with Claude Haiku integration"
```

---

## Task 3: `useAiRecommend` 훅 작성

**Files:**
- Create: `client/src/hooks/useAiRecommend.ts`

**Step 1: 훅 구현**

`client/src/hooks/useAiRecommend.ts`:

```typescript
import { useState, useCallback } from "react";
import type { AiExtractResult } from "@/lib/aiReason";
import {
  EXPERTISE_OPTIONS,
  INDUSTRY_OPTIONS,
  ROLE_OPTIONS,
} from "@/types/coach";

interface UseAiRecommendReturn {
  recommend: (query: string) => Promise<AiExtractResult | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAiRecommend(): UseAiRecommendReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommend = useCallback(async (query: string): Promise<AiExtractResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          availableExpertise: EXPERTISE_OPTIONS,
          availableIndustries: INDUSTRY_OPTIONS,
          availableRoles: ROLE_OPTIONS,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const result: AiExtractResult = await response.json();
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { recommend, isLoading, error, clearError };
}
```

**Step 2: TypeScript 타입 체크**

```bash
pnpm check
```

Expected: 에러 없음

**Step 3: 커밋**

```bash
git add client/src/hooks/useAiRecommend.ts
git commit -m "feat: add useAiRecommend hook for Claude API calls"
```

---

## Task 4: `useCoachSearch`에 AI 부스트 스코어 지원 추가

**Files:**
- Modify: `client/src/hooks/useCoachSearch.ts`

**Step 1: 현재 파일 읽기**

`client/src/hooks/useCoachSearch.ts` 전체 읽기

**Step 2: AI 부스트 상태 및 로직 추가**

`useCoachSearch.ts` 에서 다음 변경:

1. import 추가 (파일 상단):
```typescript
import type { AiExtractResult } from "@/lib/aiReason";
import { generateAiReason } from "@/lib/aiReason";
```

2. `useCoachSearch` 함수 안에 상태 추가 (`useState<FilterState>` 아래):
```typescript
const [aiResult, setAiResult] = useState<AiExtractResult | null>(null);
```

3. `rankedCoaches` useMemo 안의 score 계산 끝부분 (`return { coach, score }` 바로 앞)에 추가:
```typescript
// AI freeKeyword 부스트
if (aiResult) {
  const coachText = [
    coach.intro,
    coach.career_history,
    coach.current_work,
    coach.underdogs_history,
    coach.tools_skills,
  ].join(" ").toLowerCase();
  aiResult.freeKeywords.forEach((kw) => {
    if (coachText.includes(kw.toLowerCase())) score += 3;
  });
}
```

4. `rankedCoaches` useMemo dependency array에 `aiResult` 추가:
```typescript
}, [filteredCoaches, filters, aiResult]);
```

5. `topCoaches` useMemo 수정 - `aiReason` 포함:
```typescript
const topCoaches = useMemo(() => {
  return rankedCoaches.slice(0, filters.resultCount).map((item) => ({
    ...item,
    aiReason: aiResult ? generateAiReason(item.coach, aiResult) : undefined,
  }));
}, [rankedCoaches, filters.resultCount, aiResult]);
```

6. `applyAiResult` 함수 추가 (return 문 바로 앞):
```typescript
const applyAiResult = useCallback((result: AiExtractResult) => {
  setAiResult(result);
  // 기존 필터도 자동 업데이트
  setFilters((prev) => ({
    ...prev,
    expertise: result.expertise.length > 0 ? result.expertise : prev.expertise,
    industries: result.industries.length > 0 ? result.industries : prev.industries,
    roles: result.roles.length > 0 ? result.roles : prev.roles,
  }));
}, []);

const clearAiResult = useCallback(() => {
  setAiResult(null);
}, []);
```

7. return 객체에 추가:
```typescript
return {
  // ... 기존 항목들 ...
  aiResult,
  applyAiResult,
  clearAiResult,
};
```

**Step 3: 타입 체크**

```bash
pnpm check
```

Expected: 에러 없음

**Step 4: 커밋**

```bash
git add client/src/hooks/useCoachSearch.ts client/src/lib/aiReason.ts
git commit -m "feat: integrate AI boost scoring into useCoachSearch"
```

---

## Task 5: `CoachCard`에 AI 추천 이유 표시 추가

**Files:**
- Modify: `client/src/components/CoachCard.tsx`

**Step 1: props에 `aiReason` 추가**

`CoachCardProps` 인터페이스에 추가:
```typescript
aiReason?: string;
```

함수 파라미터에도 추가:
```typescript
export default function CoachCard({
  coach,
  score,
  rank,
  isSelected,
  onToggle,
  onViewDetail,
  onEdit,
  aiReason,        // ← 추가
}: CoachCardProps) {
```

**Step 2: AI 추천 이유 UI 추가**

`coach.intro` 표시 블록 바로 **아래**, 태그 블록 **위**에 삽입:

```tsx
{/* AI 추천 이유 */}
{aiReason && (
  <div className="flex items-start gap-1 mb-2 px-1.5 py-1 bg-primary/5 border border-primary/20 rounded-[2px]">
    <span className="text-[9px] font-bold text-primary mt-[1px] shrink-0">✦ AI</span>
    <span className="text-[10px] text-primary/80 leading-snug">{aiReason}</span>
  </div>
)}
```

**Step 3: 타입 체크**

```bash
pnpm check
```

Expected: 에러 없음

**Step 4: 커밋**

```bash
git add client/src/components/CoachCard.tsx
git commit -m "feat: display AI recommendation reason on coach card"
```

---

## Task 6: `AiRecommendModal` 컴포넌트 작성

**Files:**
- Create: `client/src/components/AiRecommendModal.tsx`

**Step 1: 컴포넌트 작성**

`client/src/components/AiRecommendModal.tsx`:

```tsx
/*
 * AiRecommendModal - 자연어 코치 추천 입력 모달
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { useAiRecommend } from "@/hooks/useAiRecommend";
import type { AiExtractResult } from "@/lib/aiReason";

interface AiRecommendModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (result: AiExtractResult) => void;
}

const EXAMPLE_QUERIES = [
  "헬스케어 스타트업 BM 검증 코치 3명 필요",
  "ESG/임팩트 투자 경험 있는 전문가 추천",
  "일본 진출 준비 중인 팀을 위한 글로벌 코치",
];

export default function AiRecommendModal({
  open,
  onClose,
  onApply,
}: AiRecommendModalProps) {
  const [query, setQuery] = useState("");
  const { recommend, isLoading, error, clearError } = useAiRecommend();

  const handleSubmit = async () => {
    if (!query.trim()) return;
    const result = await recommend(query.trim());
    if (result) {
      onApply(result);
      onClose();
      setQuery("");
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setQuery("");
      clearError();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-[4px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
            <Sparkles className="w-4 h-4 text-primary" />
            AI 코치 추천
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3">
          <p className="text-[12px] text-muted-foreground">
            어떤 프로그램에 필요한 코치인지 자유롭게 작성해주세요.
          </p>

          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: AI 스타트업 대상 IR 피칭 워크샵 진행 예정. 투자 심사 경험 있고 스타트업 멘토링을 해본 코치가 필요합니다."
            className="min-h-[100px] text-[13px] rounded-[3px] resize-none focus-visible:ring-1 focus-visible:ring-primary"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />

          {/* 예시 쿼리 */}
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">예시:</p>
            <div className="flex flex-col gap-1">
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  className="text-left text-[11px] text-primary/70 hover:text-primary underline-offset-2 hover:underline transition-colors"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>

          {/* 오류 메시지 */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-[3px]">
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">⌘ + Enter 로 바로 추천</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="h-8 px-4 text-[12px] rounded-[2px]"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !query.trim()}
              className="h-8 px-4 text-[12px] rounded-[2px] bg-primary text-white hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  AI 추천 받기
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: 타입 체크**

```bash
pnpm check
```

Expected: 에러 없음 (shadcn Textarea가 없으면 오류 발생 - Step 3 참고)

**Step 2-A: Textarea 컴포넌트 없을 경우**

```bash
# shadcn Textarea가 없다면:
ls client/src/components/ui/textarea.tsx
```

없으면:
```bash
# Textarea는 shadcn/ui 기본 컴포넌트. 직접 생성:
cat > client/src/components/ui/textarea.tsx << 'EOF'
import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
EOF
```

**Step 3: 커밋**

```bash
git add client/src/components/AiRecommendModal.tsx client/src/components/ui/textarea.tsx
git commit -m "feat: add AiRecommendModal component"
```

---

## Task 7: `Home.tsx` 에 AI 추천 버튼 + 모달 연결

**Files:**
- Modify: `client/src/pages/Home.tsx`

**Step 1: 현재 Home.tsx 읽기**

**Step 2: 변경 사항 적용**

1. import 추가 (기존 import 블록 끝에):
```typescript
import AiRecommendModal from "@/components/AiRecommendModal";
import { Sparkles } from "lucide-react";
import type { AiExtractResult } from "@/lib/aiReason";
```
> 주의: `Sparkles`는 lucide-react에 있음. 기존 import에 추가

2. `useCoachSearch`에서 AI 관련 상태 추가:
```typescript
const {
  filters,
  updateFilter,
  resetFilters,
  filteredCoaches,
  topCoaches,
  selectedCoaches,
  selectedCoachList,
  toggleCoach,
  selectTopCoaches,
  clearSelection,
  allCoaches,
  stats,
  aiResult,          // ← 추가
  applyAiResult,     // ← 추가
  clearAiResult,     // ← 추가
} = useCoachSearch();
```

3. 컴포넌트 안에 상태 추가 (`useState<Coach | null>` 아래):
```typescript
const [aiModalOpen, setAiModalOpen] = useState(false);
```

4. `handleApplyAi` 핸들러 추가:
```typescript
const handleApplyAi = (result: AiExtractResult) => {
  applyAiResult(result);
};
```

5. 툴바의 "신규 등록 버튼" 바로 **앞**에 AI 추천 버튼 삽입:
```tsx
{/* AI 추천 버튼 */}
<Button
  onClick={() => setAiModalOpen(true)}
  variant="outline"
  className="h-7 px-3 text-[11px] rounded-[2px] border-primary text-primary hover:bg-primary hover:text-white"
>
  <Sparkles className="w-3 h-3 mr-1" />
  AI 추천
</Button>
```

6. AI 추천 적용 중 배지 추가 (toolabar의 `hasActiveFilters` 표시 블록 아래):
```tsx
{/* AI 추천 적용 중 배지 */}
{aiResult && (
  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/30 rounded-[2px]">
    <Sparkles className="w-3 h-3 text-primary" />
    <span className="text-[10px] text-primary font-medium truncate max-w-[180px]">
      {aiResult.summary}
    </span>
    <button
      onClick={clearAiResult}
      className="text-primary/60 hover:text-primary ml-1 text-[11px] font-bold leading-none"
    >
      ✕
    </button>
  </div>
)}
```

7. `CoachCard` 렌더링에 `aiReason` prop 추가:
```tsx
<CoachCard
  key={item.coach.id}
  coach={item.coach}
  score={viewMode === "recommended" ? item.score : undefined}
  rank={viewMode === "recommended" ? idx + 1 : undefined}
  isSelected={selectedCoaches.has(item.coach.id)}
  onToggle={() => toggleCoach(item.coach.id)}
  onViewDetail={() => setDetailCoach(item.coach)}
  onEdit={() => handleOpenEdit(item.coach)}
  aiReason={viewMode === "recommended" ? item.aiReason : undefined}  // ← 추가
/>
```

8. `</SelectionBar>` 바로 뒤에 모달 추가:
```tsx
{/* AI 추천 모달 */}
<AiRecommendModal
  open={aiModalOpen}
  onClose={() => setAiModalOpen(false)}
  onApply={handleApplyAi}
/>
```

**Step 3: 타입 체크**

```bash
pnpm check
```

Expected: 에러 없음

**Step 4: 커밋**

```bash
git add client/src/pages/Home.tsx
git commit -m "feat: connect AI recommendation modal to Home with boost display"
```

---

## Task 8: 통합 테스트 (수동)

**Step 1: 개발 서버 실행**

터미널 1 (백엔드):
```bash
cd /home/udlabs1/underdogs-coach-finder
ANTHROPIC_API_KEY=sk-ant-... tsx server/index.ts
```

터미널 2 (프론트엔드):
```bash
cd /home/udlabs1/underdogs-coach-finder
pnpm dev
```

**Step 2: 테스트 시나리오**

브라우저에서 `http://localhost:5173` (또는 Vite 기본 포트) 열기

| 시나리오 | 기대 결과 |
|---------|-----------|
| "AI 추천" 버튼 클릭 | 모달 열림 |
| 빈 상태로 "AI 추천 받기" | 버튼 비활성화 (클릭 불가) |
| "헬스케어 스타트업 BM 검증" 입력 후 전송 | 로딩 스피너 → 모달 닫힘 → 코치 목록 변경 |
| 툴바 확인 | AI 추천 적용 중 배지 + summary 텍스트 표시 |
| 코치 카드 확인 | ✦ AI 추천 이유 표시 |
| 배지의 ✕ 클릭 | AI 추천 해제, 카드 이유 제거 |
| ANTHROPIC_API_KEY 없이 실행 | 모달에 오류 메시지 표시 |

**Step 3: 최종 커밋**

```bash
git add -A
git commit -m "feat: complete AI natural language coach recommendation feature"
```

---

## 요약: 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `server/index.ts` | `/api/recommend` 엔드포인트 추가 |
| `client/src/lib/aiReason.ts` | 추천 이유 생성 순수 함수 (신규) |
| `client/src/lib/aiReason.test.ts` | 테스트 (신규) |
| `client/src/hooks/useAiRecommend.ts` | API 호출 훅 (신규) |
| `client/src/hooks/useCoachSearch.ts` | AI 부스트 스코어 + applyAiResult 추가 |
| `client/src/components/AiRecommendModal.tsx` | 자연어 입력 모달 (신규) |
| `client/src/components/CoachCard.tsx` | aiReason prop + UI 추가 |
| `client/src/pages/Home.tsx` | AI 버튼 + 모달 + 배지 연결 |
| `client/src/components/ui/textarea.tsx` | shadcn Textarea 컴포넌트 (없으면 신규) |
