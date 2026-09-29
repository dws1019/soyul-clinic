# 소율한의원 홈페이지

구의역 이명·난청 특화 한의원 **소율한의원**의 홈페이지입니다. (2026년 11월 개원 예정)

- 사이트 주소: <https://dws1019.github.io/soyul-clinic/>
- 한 페이지짜리 정적 사이트(HTML · CSS · JavaScript)라 따로 빌드할 필요 없이 GitHub Pages로 바로 배포됩니다.

## 파일 구성

| 경로 | 내용 |
| --- | --- |
| `index.html` | 홈페이지 본문 (한 페이지 구성) |
| `assets/css/tokens.css` | 색 · 글꼴 · 간격 값 |
| `assets/css/soyul.css` | 화면 디자인 |
| `assets/js/soyul.js` | 기능 — 실시간 진료 표시, 길찾기 연결, 자가 체크, 메뉴 |
| `assets/img/` | 로고, 원장 사진, 공간 예시 이미지, 약도, 링크 공유 이미지 |
| `assets/fonts/` | 나눔스퀘어(제목) · 프리텐다드(본문) — SIL OFL 1.1 |

## 자주 바꾸는 값

`index.html` 위쪽 `<script id="soyul-config" type="application/json">` 안의 값만 바꾸면 사이트 전체에 반영됩니다.

| 키 | 내용 |
| --- | --- |
| `kakaoChannel` | 카카오톡 채널 채팅 주소 — 비워 두면 '오픈 예정'으로 표시 |
| `naverBooking` | 네이버 예약 주소 — 비워 두면 '오픈 예정'으로 표시 |
| `openDate` | 개원일(YYYY-MM-DD). 이 날짜 전에는 '개원 예정', 이후에는 실시간 진료 상태를 표시하고 개인정보처리방침 시행일로도 쓰입니다 |
| `hours` | 평일 · 토일공휴일 진료시간과 평일 점심시간(`lunch`) |
| `holidays` | 평일 공휴일 목록 — 이 날은 10:00–15:00 진료로 표시 |
| `heroVideo` | 대문 영상 경로 — 비워 두면 움직이는 약도 |
| `photos` · `photoNote` | 공간 사진 경로 · 사진 위 표시(지금은 "예시 이미지") |
| `notice` | 맨 위 띠 공지 — 비워 두면 숨김 |

## 수정 내용 반영하기

`main` 브랜치에 올리면 GitHub Pages가 1~2분 안에 다시 배포합니다.

```bash
git add -A
git commit -m "수정 내용 요약"
git push
```

GitHub 웹에서 파일을 열어 바로 고치고 커밋해도 같은 방식으로 반영됩니다.

## 도메인을 연결할 때

저장소 Settings → Pages → Custom domain에 도메인을 입력하고, `index.html`의 `og:url` · `og:image` · `canonical` 주소와 구조화 데이터의 `url` · `image`를 새 도메인으로 바꿔 주세요.

## 참고

- 공간 사진 4장은 분위기 확인용 **예시 이미지(AI 생성)** 입니다. 실제 사진으로 바꾼 뒤 `photoNote`를 비워 주세요.
- 비급여 진료비와 개인정보처리방침의 위탁업체는 개원 전에 채워야 합니다(`index.html`에서 "게시 예정", "개원 시 게시" 검색).
- 글꼴 라이선스는 `assets/fonts/OFL.txt`, 아이콘 라이선스는 `NOTICE.txt`에 있습니다.
