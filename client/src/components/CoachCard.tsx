/*
 * CoachCard - Swiss Industrial Design
 * 얇은 1px 구분선, 원형 흑백 사진, 모노스페이스 숫자
 */
import { Check, User } from "lucide-react";
import type { Coach } from "@/types/coach";
import { motion } from "framer-motion";

interface CoachCardProps {
  coach: Coach;
  score?: number;
  rank?: number;
  isSelected: boolean;
  onToggle: () => void;
  onViewDetail: () => void;
}

function formatCareer(raw: string, years: number): string {
  if (raw && raw !== "nan") return raw;
  if (years > 0) return `${years}년`;
  return "-";
}

export default function CoachCard({
  coach,
  score,
  rank,
  isSelected,
  onToggle,
  onViewDetail,
}: CoachCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: rank ? rank * 0.03 : 0 }}
      className={`group relative border transition-all duration-150 ${
        isSelected
          ? "border-primary bg-red-50/40 shadow-[inset_3px_0_0_0_#E53935]"
          : "border-border bg-white hover:border-gray-300"
      }`}
    >
      {/* 랭크 번호 */}
      {rank !== undefined && (
        <div className="absolute top-0 left-0 w-6 h-6 flex items-center justify-center bg-foreground text-white text-[10px] font-mono font-semibold">
          {rank}
        </div>
      )}

      {/* 선택 체크 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center border rounded-[2px] transition-all z-10 ${
          isSelected
            ? "bg-primary border-primary"
            : "border-gray-300 hover:border-primary bg-white"
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="p-4 cursor-pointer" onClick={onViewDetail}>
        {/* 상단: 사진 + 이름 */}
        <div className="flex items-start gap-3 mb-3">
          {/* 원형 흑백 사진 */}
          <div className="w-[52px] h-[52px] rounded-full overflow-hidden flex-shrink-0 bg-gray-100 ring-1 ring-gray-200">
            {coach.photo_url ? (
              <img
                src={coach.photo_url}
                alt={coach.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <User className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-[15px] font-bold text-foreground leading-tight tracking-tight">
              {coach.name}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {coach.organization} · {coach.position}
            </p>
            {score !== undefined && score > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="w-12 h-[3px] bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(score * 10, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {score.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 한줄 소개 */}
        {coach.intro && (
          <p className="text-[11px] text-primary/80 italic mb-2.5 line-clamp-1 leading-relaxed">
            "{coach.intro}"
          </p>
        )}

        {/* 태그들 */}
        <div className="flex flex-wrap gap-1 mb-2.5">
          {coach.roles.map((role) => (
            <span
              key={role}
              className="px-1.5 py-[2px] text-[10px] font-medium bg-foreground text-white leading-tight"
            >
              {role}
            </span>
          ))}
          {coach.expertise.slice(0, 2).map((exp) => (
            <span
              key={exp}
              className="px-1.5 py-[2px] text-[10px] text-muted-foreground border border-border leading-tight"
            >
              {exp.length > 16 ? exp.slice(0, 16) + "..." : exp}
            </span>
          ))}
        </div>

        {/* 하단 정보 */}
        <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground border-t border-border pt-2.5">
          <span className="font-mono font-medium text-foreground/70">
            {formatCareer(coach.career_years_raw, coach.career_years)}
          </span>
          <span className="w-px h-3 bg-border" />
          <span className="truncate flex-1">
            {coach.industries.slice(0, 2).join(", ") || "-"}
          </span>
          {coach.overseas && (
            <>
              <span className="w-px h-3 bg-border" />
              <span className="text-primary font-semibold whitespace-nowrap">해외</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
