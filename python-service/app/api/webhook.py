"""
Google Sheets 자동 동기화 & 수동 갱신 엔드포인트

설정:
  GOOGLE_SHEETS_ID  환경변수에 Google Sheets ID를 입력하면 자동 연동됩니다.
  Sheets를 "링크가 있는 사람 누구나 볼 수 있음"으로 공유해야 합니다.

  스프레드시트 컬럼 형식 (첫 행 헤더):
  id, name, tier, category, intro, expertise(쉼표 구분), industries(쉼표 구분),
  regions, roles, career_history, current_work, underdogs_history,
  career_years, organization, position, photo_url, country, overseas,
  has_startup, education, tools_skills, main_field
"""

from fastapi import APIRouter, Request, BackgroundTasks
import logging
import json
import os
import csv
import io
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional

import httpx

router = APIRouter()
logger = logging.getLogger(__name__)

COACHES_PATH = Path(__file__).parent.parent.parent / "coaches_db.json"

_last_refresh: Optional[datetime] = None
_last_count: int = 0


def _parse_list_field(value: str) -> list:
    return [x.strip() for x in value.split(",") if x.strip()]


def _parse_bool(value: str) -> bool:
    return value.strip().lower() in ("true", "1", "yes")


async def _sync_from_sheets():
    """Google Sheets CSV를 다운로드하여 coaches_db.json 갱신 + FAISS 재빌드"""
    global _last_refresh, _last_count

    sheets_id = os.getenv("GOOGLE_SHEETS_ID", "").strip()
    if not sheets_id:
        logger.warning("GOOGLE_SHEETS_ID 환경변수가 설정되지 않아 동기화를 건너뜁니다.")
        return

    csv_url = (
        f"https://docs.google.com/spreadsheets/d/{sheets_id}"
        f"/export?format=csv&gid=0"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.get(csv_url)
            res.raise_for_status()
    except Exception as e:
        logger.error(f"Google Sheets 다운로드 실패: {e}")
        return

    reader = csv.DictReader(io.StringIO(res.text))
    coaches = []
    for i, row in enumerate(reader):
        try:
            coach = {
                "id": int(row.get("id") or i + 1),
                "name": row.get("name", "").strip(),
                "tier": int(row.get("tier") or 3),
                "category": row.get("category", "").strip(),
                "intro": row.get("intro", "").strip(),
                "expertise": _parse_list_field(row.get("expertise", "")),
                "industries": _parse_list_field(row.get("industries", "")),
                "regions": _parse_list_field(row.get("regions", "")),
                "roles": _parse_list_field(row.get("roles", "")),
                "career_history": row.get("career_history", "").strip(),
                "current_work": row.get("current_work", "").strip(),
                "underdogs_history": row.get("underdogs_history", "").strip(),
                "career_years": int(row.get("career_years") or 0),
                "organization": row.get("organization", "").strip(),
                "position": row.get("position", "").strip(),
                "photo_url": row.get("photo_url", "").strip(),
                "country": row.get("country", "KR").strip() or "KR",
                "overseas": _parse_bool(row.get("overseas", "false")),
                "has_startup": _parse_bool(row.get("has_startup", "false")),
                "education": row.get("education", "").strip(),
                "tools_skills": row.get("tools_skills", "").strip(),
                "main_field": row.get("main_field", "").strip(),
            }
            if coach["name"]:  # 이름 없는 행 제외
                coaches.append(coach)
        except Exception as row_err:
            logger.warning(f"행 {i} 파싱 오류: {row_err}")

    if not coaches:
        logger.warning("파싱된 코치 데이터가 없습니다. 동기화 취소.")
        return

    # coaches_db.json 저장
    with open(COACHES_PATH, "w", encoding="utf-8") as f:
        json.dump(coaches, f, ensure_ascii=False, indent=2)

    logger.info(f"Google Sheets → coaches_db.json 동기화 완료: {len(coaches)}명")
    _last_count = len(coaches)

    # FAISS 인덱스 재빌드
    try:
        from app.core.database import vector_db

        coaches_data = []
        for coach in coaches:
            text_parts = [
                f"이름: {coach['name']}",
                f"소개: {coach['intro']}",
                f"전문 분야: {', '.join(coach['expertise'])}",
                f"주요 산업: {', '.join(coach['industries'])}",
                f"경력: {coach['career_history']}",
                f"현재 업무: {coach['current_work']}",
            ]
            full_text = "\n".join([p for p in text_parts if p.split(": ", 1)[1]])
            coaches_data.append({
                "text": full_text,
                "metadata": {
                    "id": coach["id"],
                    "name": coach["name"],
                    "tier": coach["tier"],
                    "category": coach["category"],
                },
            })

        vector_db._vectorstore = None
        if os.path.exists(vector_db.index_path):
            shutil.rmtree(vector_db.index_path)

        for i in range(0, len(coaches_data), 50):
            vector_db.add_coaches(coaches_data[i:i + 50])

        logger.info("FAISS 인덱스 재빌드 완료")
    except Exception as e:
        logger.error(f"FAISS 재빌드 실패: {e}")

    _last_refresh = datetime.utcnow()


@router.post("/webhook/drive")
async def drive_webhook(request: Request, background_tasks: BackgroundTasks):
    """Google Drive 푸시 알림 수신 → 백그라운드 동기화 트리거"""
    resource_state = request.headers.get("X-Goog-Resource-State")
    if resource_state in ("add", "update", "change"):
        background_tasks.add_task(_sync_from_sheets)
    return {"status": "success"}


@router.post("/refresh")
async def manual_refresh(background_tasks: BackgroundTasks):
    """수동으로 Google Sheets 동기화 + FAISS 재빌드 트리거"""
    sheets_id = os.getenv("GOOGLE_SHEETS_ID", "").strip()
    if not sheets_id:
        return {
            "status": "skipped",
            "message": "GOOGLE_SHEETS_ID 환경변수를 설정해야 합니다.",
        }
    background_tasks.add_task(_sync_from_sheets)
    return {"status": "triggered", "message": "동기화 시작됨. 잠시 후 완료됩니다."}


@router.get("/refresh/status")
async def refresh_status():
    """마지막 동기화 상태 조회"""
    return {
        "last_refresh": _last_refresh.isoformat() + "Z" if _last_refresh else None,
        "last_coach_count": _last_count,
        "sheets_configured": bool(os.getenv("GOOGLE_SHEETS_ID", "").strip()),
    }
