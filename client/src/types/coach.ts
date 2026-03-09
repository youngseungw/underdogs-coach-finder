export interface Coach {
  id: number;
  name: string;
  email: string;
  phone: string;
  gender: string;
  location: string;
  regions: string[];
  organization: string;
  position: string;
  industries: string[];
  expertise: string[];
  roles: string[];
  overseas: boolean;
  overseas_detail: string;
  tools_skills: string;
  intro: string;
  career_history: string;
  education: string;
  underdogs_history: string;
  current_work: string;
  career_years: number;
  career_years_raw: string;
  photo: string;
  business_type: string;
  photo_url: string;
}

export interface FilterState {
  search: string;
  expertise: string[];
  industries: string[];
  regions: string[];
  roles: string[];
  overseas: boolean | null;
  resultCount: number;
}

export const EXPERTISE_OPTIONS = [
  "창업 일반 (기업가정신/팀빌딩)",
  "비즈니스 모델 (BM/가설검증)",
  "사업계획서/IR (투자유치/피칭)",
  "마케팅/브랜딩 (시장조사/퍼포먼스)",
  "AI/DX (생성형 AI 활용/노코드)",
  "기술/R&D (제조/특허)",
  "ESG/소셜임팩트",
  "조직문화/HR",
  "로컬 비즈니스 (지역자원/크리에이터)",
  "기업인증",
  "세무개론",
  "지식재산권개론",
  "스타트업을 위한 재무분석",
  "직원 인건비 계산(노무일반)",
  "조직 문화중 멘탈케어",
  "힐링 프로그램",
  "문화예술 프로그램을 통한 소통강화",
  "화장품 / 에스테틱 서비스 / 뷰티",
  "중고생 대상 특강(2시간)",
];

export const INDUSTRY_OPTIONS = [
  "AI/딥테크/블록체인",
  "HR/조직문화/채용",
  "광고/마케팅",
  "교육",
  "모빌리티/교통",
  "물류/유통",
  "소셜/지속가능성",
  "소셜미디어/커뮤니티",
  "여행/레저",
  "제조/하드웨어",
  "커머스 일반",
  "콘텐츠/예술",
  "통신/보안/데이터",
  "투자/보육/AC/VC",
  "푸드/농업",
  "피트니스/스포츠",
  "항공/우주",
  "헬스케어/바이오",
  "홈리빙/펫",
  "환경/에너지",
];

export const REGION_OPTIONS = [
  "서울특별시",
  "경기도",
  "인천광역시",
  "부산광역시",
  "대구광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "강원도",
  "충청북도",
  "충청남도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
  "해외 및 기타",
];

export const ROLE_OPTIONS = ["코칭", "강의", "운영/PM"];
