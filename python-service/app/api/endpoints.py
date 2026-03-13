from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import json
import asyncio

from app.core.rag import extract_rfp_info, build_search_query
from app.core.database import vector_db

router = APIRouter()

COACHES_PATH = Path(__file__).parent.parent.parent / "coaches_db.json"


def _load_coaches() -> list:
    with open(COACHES_PATH, encoding="utf-8") as f:
        return json.load(f)


class FilterParams(BaseModel):
    industries: List[str] = []
    expertise: List[str] = []
    regions: List[str] = []
    roles: List[str] = []
    tiers: List[int] = []
    categories: List[str] = []


class RecommendRequest(BaseModel):
    rfp_text: str
    top_k: int = 50      # 프론트엔드에서 resultCount 전달 (기본 50)
    filters: Optional[FilterParams] = None


def _score_coaches(coaches: list, keywords: list, filters: Optional[FilterParams], vector_bonus: dict) -> list:
    """하이브리드 스코어: 티어 기본값 + FAISS 벡터 보너스 + 키워드 매칭 + 필터 보너스"""
    results = []
    for coach in coaches:
        tier = coach.get("tier", 3)
        coach_id = coach.get("id")

        # Hard 필터: 티어, 카테고리
        if filters and filters.tiers and tier not in filters.tiers:
            continue
        if filters and filters.categories and coach.get("category") not in filters.categories:
            continue

        # 티어 기본 점수
        score = {1: 10, 2: 5}.get(tier, 1)

        # FAISS 벡터 유사도 보너스 (0~10점)
        score += vector_bonus.get(coach_id, 0)

        # 키워드 매칭 점수
        haystack = " ".join([
            coach.get("name", ""),
            coach.get("intro", ""),
            coach.get("career_history", ""),
            coach.get("current_work", ""),
            coach.get("underdogs_history", ""),
            coach.get("main_field", ""),
            " ".join(coach.get("expertise", [])),
            " ".join(coach.get("industries", [])),
            " ".join(coach.get("roles", [])),
        ]).lower()

        for kw in keywords:
            if kw and kw.lower() in haystack:
                score += 3

        # Soft 필터 보너스
        if filters:
            for ind in filters.industries:
                if ind.lower() in " ".join(coach.get("industries", [])).lower():
                    score += 2
            for exp in filters.expertise:
                if exp.lower() in " ".join(coach.get("expertise", [])).lower():
                    score += 2
            for reg in filters.regions:
                if reg.lower() in " ".join(coach.get("regions", [])).lower():
                    score += 1
            for role in filters.roles:
                if role.lower() in " ".join(coach.get("roles", [])).lower():
                    score += 2

        results.append({
            "score": round(score, 2),
            "metadata": {
                "id": coach_id,
                "name": coach.get("name"),
                "tier": tier,
            }
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def _get_vector_bonus(search_query: str, top_k: int) -> dict:
    """FAISS 벡터 검색 결과를 보너스 점수 딕셔너리로 변환. 실패 시 빈 dict 반환."""
    try:
        vector_results = vector_db.search_coaches(search_query, top_k=min(top_k * 3, 60))
        n = len(vector_results)
        bonus = {}
        for rank, (doc, _score) in enumerate(vector_results):
            cid = doc.metadata.get("id")
            if cid is not None:
                bonus[cid] = (n - rank) / n * 10  # 1위=10점, 순위 낮을수록 감소
        return bonus
    except Exception:
        return {}  # FAISS 인덱스 미준비 시 키워드 전용으로 폴백


def _resolve_top_k(req_top_k: int, extraction: dict) -> int:
    """RFP에서 추출한 coach_count와 요청 top_k 중 큰 값을 사용 (최대 100)"""
    from_rfp = int(extraction.get("coach_count") or 0)
    return min(max(req_top_k, from_rfp), 100)


@router.post("/recommend")
async def recommend_coaches(req: RecommendRequest):
    """하이브리드 추천: FAISS 벡터 검색 + 키워드 스코어링"""
    try:
        extraction = extract_rfp_info(req.rfp_text)
        effective_top_k = _resolve_top_k(req.top_k, extraction)
        search_query = build_search_query(extraction)
        keywords = (
            extraction.get("required_domains", [])
            + extraction.get("required_skills", [])
        )
        coaches = _load_coaches()
        vector_bonus = _get_vector_bonus(search_query, effective_top_k)
        results = _score_coaches(coaches, keywords, req.filters, vector_bonus)

        return {
            "extraction": extraction,
            "recommendations": results[:effective_top_k],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend/stream")
async def recommend_coaches_stream(req: RecommendRequest):
    """SSE 스트리밍: 코치 결과를 하나씩 프론트엔드에 전달"""

    async def event_stream():
        try:
            yield f"data: {json.dumps({'type': 'status', 'message': 'RFP 분석 중...'})}\n\n"

            extraction = extract_rfp_info(req.rfp_text)
            yield f"data: {json.dumps({'type': 'extraction', 'data': extraction})}\n\n"

            effective_top_k = _resolve_top_k(req.top_k, extraction)
            yield f"data: {json.dumps({'type': 'status', 'message': f'코치 {effective_top_k}명 매칭 중...'})}\n\n"

            keywords = (
                extraction.get("required_domains", [])
                + extraction.get("required_skills", [])
            )
            coaches = _load_coaches()
            search_query = build_search_query(extraction)
            vector_bonus = _get_vector_bonus(search_query, effective_top_k)
            results = _score_coaches(coaches, keywords, req.filters, vector_bonus)
            top_results = results[:effective_top_k]

            for i, result in enumerate(top_results):
                yield f"data: {json.dumps({'type': 'coach', 'data': result, 'index': i, 'total': len(top_results)})}\n\n"
                await asyncio.sleep(0.04)

            yield f"data: {json.dumps({'type': 'done', 'total': len(top_results)})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/ingest")
async def ingest_coaches():
    """coaches_db.json으로 FAISS 인덱스 재빌드 (배포 후 1회 실행)"""
    try:
        import os, shutil
        coaches = _load_coaches()

        coaches_data = []
        for coach in coaches:
            text_parts = [
                f"이름: {coach.get('name', '')}",
                f"소개: {coach.get('intro', '')}",
                f"전문 분야: {', '.join(coach.get('expertise', []))}",
                f"주요 산업: {', '.join(coach.get('industries', []))}",
                f"경력 사항: {coach.get('career_history', '')}",
                f"현재 업무: {coach.get('current_work', '')}",
                f"언더독스 활동: {coach.get('underdogs_history', '')}",
            ]
            full_text = "\n".join([p for p in text_parts if p.split(": ", 1)[1]])
            coaches_data.append({
                "text": full_text,
                "metadata": {
                    "id": coach.get("id"),
                    "name": coach.get("name"),
                    "tier": coach.get("tier"),
                    "category": coach.get("category"),
                },
            })

        # 기존 인덱스 초기화
        vector_db._vectorstore = None
        if os.path.exists(vector_db.index_path):
            shutil.rmtree(vector_db.index_path)

        for i in range(0, len(coaches_data), 50):
            vector_db.add_coaches(coaches_data[i:i + 50])

        return {"status": "ok", "count": len(coaches_data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
