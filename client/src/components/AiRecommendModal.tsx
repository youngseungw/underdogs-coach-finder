import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface AiRecommendModalProps {
  open: boolean;
  onClose: () => void;
  onRecommend: (rfpText: string) => Promise<void>;
}

const EXAMPLES = [
  {
    label: "청년마을 사업",
    text: "행안부 청년마을 만들기 사업입니다. 지역 커뮤니티 활성화, 마을기업, 청년 창업을 지원할 코치 30명이 필요합니다. 주요 역할은 창업 코칭과 현장 멘토링이며, 전국 각 지역에서 활동 가능한 분을 우선합니다.",
  },
  {
    label: "딥테크 스타트업",
    text: "중기부 딥테크 창업 지원 프로그램입니다. AI/딥테크, 하드웨어 제조, 투자/IR 분야 전문가 코치 10명이 필요합니다. 스타트업 엑싯 경험이 있거나 VC 출신이면 우대합니다.",
  },
  {
    label: "소셜벤처 교육",
    text: "소셜벤처 창업 교육 프로그램에서 코치 5명을 모집합니다. ESG, 사회적기업, 소셜임팩트 분야 전문가로 서울·경기 지역 활동 가능한 분이 필요합니다. 강의와 1:1 코칭 역할을 병행합니다.",
  },
];

export default function AiRecommendModal({ open, onClose, onRecommend }: AiRecommendModalProps) {
  const { t } = useLanguage();
  const [rfpText, setRfpText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = async () => {
    if (!rfpText.trim()) {
      toast.error("RFP 내용을 입력해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      await onRecommend(rfpText);
      toast.success("AI 추천이 완료되었습니다.");
      onClose();
      setRfpText("");
    } catch {
      toast.error("추천 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[620px] p-6 gap-4 rounded-[4px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("ai_recommend") || "AI 맞춤 코치 추천"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground pt-1">
            RFP 내용을 직접 입력하면 Gemini가 분석하여 최적의 코치를 추천합니다.
            <span className="text-indigo-600 font-medium"> 코치 수도 자동으로 인식합니다.</span>
          </DialogDescription>
        </DialogHeader>

        {/* 예시 버튼 */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setShowExamples((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700"
          >
            예시 보기 {showExamples ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* 예시 프롬프트 */}
        {showExamples && (
          <div className="flex flex-col gap-1.5 -mt-1">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => { setRfpText(ex.text); setShowExamples(false); }}
                className="text-left px-3 py-2 text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 rounded-[2px] leading-relaxed"
              >
                <span className="font-semibold mr-1.5">[{ex.label}]</span>{ex.text}
              </button>
            ))}
          </div>
        )}

        {/* 텍스트 입력 */}
        <div>
          <Textarea
            placeholder={"RFP 내용을 여기에 붙여넣으세요.\n\n예시: 「중기부 K-스타트업 2026 사업에서 AI/딥테크, 제조 분야 전문 코치 20명이 필요합니다. 주요 역할은 창업 코칭 및 사업계획서 멘토링이며, 서울 및 수도권 활동 가능한 분을 우선합니다.」"}
            className="min-h-[200px] resize-none text-[13px] rounded-[3px] focus-visible:ring-1 focus-visible:ring-primary border-border"
            value={rfpText}
            onChange={(e) => setRfpText(e.target.value)}
            disabled={isLoading}
          />
          {rfpText && (
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{rfpText.length.toLocaleString()}자</p>
          )}
        </div>

        <DialogFooter className="sm:justify-between items-center border-t border-border pt-4 -mx-6 px-6 -mb-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Powered by Gemini 2.5 Flash
          </span>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-[12px] h-8 rounded-[2px]"
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!rfpText.trim() || isLoading}
              className="bg-primary text-white hover:bg-primary/90 text-[12px] h-8 rounded-[2px]"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />분석 중...</>
              ) : (
                "추천받기"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
