# 인스타그램 카드뉴스 생성기

`post.json`에 내용을 적으면 1080×1350(4:5) 카드뉴스 PNG가 만들어집니다. 글꼴은 Pretendard(SIL OFL 1.1, `generator/fonts/LICENSE-Pretendard.txt`)입니다.

## 사용법

```bash
node instagram/generator/render.mjs instagram/posts/<폴더명>        # 카드뉴스 PNG 생성
node instagram/generator/render.mjs instagram/posts/<폴더명> --jpg  # JPEG도 생성 (API 게시용)
node instagram/generator/reel.mjs   instagram/posts/<폴더명>        # 같은 내용으로 릴스 reel.mp4 + reel-cover.png
node instagram/generator/grid-preview.mjs 결과.png 이미지1.png ...   # 프로필 격자(3:4) 미리보기
```

**post.json 공통 옵션**
- `series`: 표지 색. `"deadline"`(노랑, 이번 주 마감) / `"deep"`(남색, 끝장 정리, 기본값) / `"calc"`(연두, 계산·비교)
- `size`: `"4:5"`(1080×1350, 기본값) / `"3:4"`(1080×1440)

자세한 설계는 [12 썸네일·릴스 가이드](../12_인스타_썸네일_릴스_가이드.md)를 보세요.

- Node와 Playwright(Chromium)가 필요합니다.
- Claude Code 클라우드 세션에서는 이미 설치되어 있습니다.

## 슬라이드 종류

| type | 용도 | 필드 |
|---|---|---|
| `cover` | 첫 장 (훅) | `kicker`, `title`, `highlight`, `sub` |
| `list` | 대상, 기간 등 체크 목록 | `label`, `title`, `items[]`, `note` |
| `table` | 금액·조건 비교 | `label`, `title`, `rows[[항목, 값]]`, `highlight`, `note` |
| `steps` | 신청 방법 단계 | `label`, `title`, `steps[{t, d}]`, `note` |
| `warning` | 주의사항 | `label`, `title`, `items[]` |
| `outro` | 마지막 장 (저장·공유 유도, 출처) | `title`, `sub`, `buttons[]`, `items[]`, `source` |

- 줄바꿈은 `\n`으로 넣습니다.
- 이모지는 렌더링 환경에 따라 깨질 수 있어 **슬라이드 안에서는 쓰지 않습니다.** 캡션에서는 써도 됩니다.

## 폴더 구조

```
instagram/
  generator/render.mjs        생성기
  generator/fonts/            Pretendard 글꼴
  posts/<YYYY-MM-주제>/
    post.json                 슬라이드 내용
    caption.md                캡션, 해시태그, 대체 텍스트, 첫 댓글
    slide-01.png ...          결과물
```

## 매주 흐름

1. Claude에게 요청합니다. 예: "이번 주 카드뉴스 만들어줘: 주제 ○○"
2. Claude가 하는 일:
   - 공고 원문을 확인합니다.
   - `post.json`과 `caption.md`를 작성합니다.
   - PNG를 생성해 대화로 보내줍니다.
3. 내가 하는 일:
   - 숫자를 원문과 확인합니다.
   - 이미지를 폰에 저장합니다.
   - 인스타 앱에서 예약 게시합니다.
