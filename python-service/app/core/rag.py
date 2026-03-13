import re
import json
import os
import google.generativeai as genai

# Gemini 직접 호출 (LangChain 파서 우회 — gemini-2.5-flash thinking 호환)
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

_model = genai.GenerativeModel(
    "gemini-2.5-flash",
    generation_config=genai.GenerationConfig(
        temperature=0.1,
        response_mime_type="application/json",   # JSON 모드 강제
    ),
)

SYSTEM_PROMPT = """You are an expert project manager analyzing Korean RFP documents.
Extract structured requirements and return ONLY a valid JSON object with these fields:
- project_name: string (project or program name)
- required_domains: list of strings (key industry domains in Korean)
- required_skills: list of strings (key competencies/skills needed from coaches, in Korean)
- coach_count: integer (number of coaches requested, 0 if not mentioned)
- budget: integer or null (total budget in KRW if mentioned)
- summary: string (1-2 sentence Korean summary of the project goal)
"""


def _extract_json(text: str) -> dict:
    """응답 텍스트에서 JSON 추출 (코드블록 포함 처리)"""
    # 직접 파싱
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    # 마크다운 코드블록에서 추출
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # 첫 번째 { ... } 블록 추출
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return {}


def extract_rfp_info(rfp_text: str) -> dict:
    """RFP 텍스트에서 구조화된 요구사항 추출"""
    prompt = f"{SYSTEM_PROMPT}\n\nRFP TEXT:\n{rfp_text[:6000]}"
    response = _model.generate_content(prompt)
    raw = response.text or ""
    result = _extract_json(raw)
    # 기본값 보장
    result.setdefault("project_name", "")
    result.setdefault("required_domains", [])
    result.setdefault("required_skills", [])
    result.setdefault("coach_count", 0)
    result.setdefault("budget", None)
    result.setdefault("summary", "")
    return result


RFPExtraction = dict


def build_search_query(extraction: dict) -> str:
    """추출 결과를 벡터 검색 쿼리로 변환"""
    domains = ", ".join(extraction.get("required_domains", []))
    skills = ", ".join(extraction.get("required_skills", []))
    summary = extraction.get("summary", "")
    return f"전문 분야: {domains}. 핵심 역량: {skills}. 요약: {summary}"
