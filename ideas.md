# 언더독스 코치 검색 시스템 - 디자인 아이디어

## 목적
제안서에 적합한 코치를 빠르게 검색하고, 선택한 코치들의 프로필을 워드/PPT 형태로 즉시 출력할 수 있는 내부 도구

---

<response>
## 아이디어 1: Swiss Industrial Dashboard
<probability>0.07</probability>

### Design Movement
스위스 국제 타이포그래피 스타일(International Typographic Style)에서 영감받은 정보 밀도 높은 대시보드. 그리드 시스템과 타이포그래피 위계를 극도로 중시하며, 데이터를 명확하고 효율적으로 전달하는 것에 집중.

### Core Principles
1. 정보 밀도 우선 - 불필요한 장식 없이 데이터 자체가 디자인
2. 엄격한 그리드 시스템 - 8px 기반 그리드로 모든 요소 정렬
3. 타이포그래피 위계 - 굵기와 크기만으로 정보 구조 표현
4. 기능적 색상 - 색상은 상태 표시와 구분에만 사용

### Color Philosophy
순수 흰색 배경(#FFFFFF)에 차콜 블랙(#1A1A1A) 텍스트. 강조색은 단 하나, 신호 빨강(#E53935)만 사용하여 CTA와 선택 상태를 표시. 나머지는 그레이스케일 5단계로 구성.

### Layout Paradigm
좌측 고정 필터 패널(280px) + 우측 데이터 테이블/카드 그리드. 필터는 항상 노출되어 즉각적인 조작 가능. 상단에는 검색 바와 선택된 코치 수 카운터만 배치.

### Signature Elements
- 모노스페이스 숫자 표기 (코치 수, 경력 연수 등)
- 얇은 1px 구분선으로 섹션 분리
- 흑백 코치 사진의 원형 마스크

### Interaction Philosophy
즉각적 피드백. 필터 변경 시 0ms 딜레이로 결과 갱신. 호버 시 미세한 배경색 변화만. 과도한 애니메이션 배제.

### Animation
- 필터 결과 변경 시 fade-in 200ms
- 카드 선택 시 체크마크 스케일 애니메이션 150ms
- 모달 오픈 시 opacity + translateY 250ms

### Typography System
- 제목: Pretendard Bold 24px / 32px
- 소제목: Pretendard SemiBold 16px / 24px
- 본문: Pretendard Regular 14px / 22px
- 캡션: Pretendard Regular 12px / 18px
- 숫자: JetBrains Mono 14px
</response>

<response>
## 아이디어 2: Warm Consulting Workspace
<probability>0.06</probability>

### Design Movement
Scandinavian Functionalism과 따뜻한 컨설팅 펌 미학의 결합. 나무 질감과 따뜻한 톤으로 전문성과 친근함을 동시에 전달. McKinsey 보고서의 정돈된 느낌에 북유럽 디자인의 온기를 더함.

### Core Principles
1. 따뜻한 전문성 - 딱딱하지 않으면서도 신뢰감 있는 톤
2. 카드 기반 정보 구조 - 각 코치가 하나의 완결된 카드
3. 부드러운 그림자 - 깊이감을 통한 계층 표현
4. 여백의 미학 - 충분한 패딩으로 호흡감 제공

### Color Philosophy
따뜻한 아이보리 배경(#FAF8F5)에 다크 브라운(#2C2418) 텍스트. 주요 액센트는 테라코타(#C4704B), 보조 액센트는 올리브 그린(#6B7D5C). 카드 배경은 순백(#FFFFFF)으로 부유감 표현.

### Layout Paradigm
상단 검색/필터 바 + 메인 영역은 3열 카드 그리드. 코치 선택 시 우측에서 슬라이드인되는 상세 패널. 하단 고정 바에 선택된 코치 목록과 내보내기 버튼.

### Signature Elements
- 둥근 모서리(12px)의 따뜻한 카드 디자인
- 코치 사진 위에 미세한 베이지 오버레이
- 선택된 코치 카드에 테라코타 좌측 보더

### Interaction Philosophy
부드럽고 자연스러운 전환. 마우스 호버 시 카드가 미세하게 떠오르는 효과. 선택/해제가 직관적이고 되돌리기 쉬운 구조.

### Animation
- 카드 호버: translateY(-4px) + shadow 확대 300ms ease
- 필터 패널 토글: height 애니메이션 350ms
- 상세 패널 슬라이드: translateX 400ms cubic-bezier
- 내보내기 진행: 프로그레스 바 애니메이션

### Typography System
- 제목: Noto Serif KR Bold 28px / 38px
- 소제목: Pretendard SemiBold 18px / 26px
- 본문: Pretendard Regular 15px / 24px
- 태그: Pretendard Medium 12px / 16px
</response>

<response>
## 아이디어 3: Dark Command Center
<probability>0.08</probability>

### Design Movement
Bloomberg Terminal과 현대 DevOps 대시보드에서 영감받은 다크 모드 커맨드 센터. 높은 정보 밀도와 빠른 조작성을 최우선으로 하는 파워유저 인터페이스.

### Core Principles
1. 다크 모드 기본 - 장시간 사용에 최적화된 눈 편안한 UI
2. 키보드 우선 - 검색, 필터, 선택 모두 키보드로 조작 가능
3. 실시간 피드백 - 모든 조작에 즉각적 시각 반응
4. 컴팩트 레이아웃 - 화면에 최대한 많은 정보 표시

### Color Philosophy
딥 네이비 배경(#0F1419)에 소프트 화이트(#E7E9EA) 텍스트. 주요 액센트는 일렉트릭 블루(#1D9BF0), 성공 상태는 에메랄드(#00BA7C), 경고는 앰버(#FFD60A). 카드 배경은 약간 밝은 네이비(#1A2332).

### Layout Paradigm
전체 화면 활용. 좌측 좁은 사이드바(아이콘 네비게이션) + 중앙 검색/필터 + 우측 결과 리스트. 코치 선택 시 하단 드로어에 선택 목록 표시. 커맨드 팔레트(Cmd+K)로 빠른 검색.

### Signature Elements
- 글로우 효과가 있는 선택 상태 보더
- 코치 사진의 원형 + 미세한 블루 글로우 링
- 태그에 반투명 배경 + 밝은 텍스트

### Interaction Philosophy
속도와 효율. 더블클릭으로 즉시 선택, 드래그로 다중 선택. 키보드 단축키 전면 지원. 최소한의 클릭으로 최대 작업 수행.

### Animation
- 선택 시 블루 글로우 펄스 200ms
- 리스트 항목 진입: stagger fade-in 50ms 간격
- 드로어 오픈: translateY + opacity 300ms
- 내보내기 완료: 체크마크 드로잉 애니메이션

### Typography System
- 제목: Geist Bold 22px / 30px
- 소제목: Geist SemiBold 15px / 22px
- 본문: Geist Regular 13px / 20px
- 코드/숫자: Geist Mono 13px / 20px
- 태그: Geist Medium 11px / 16px
</response>
