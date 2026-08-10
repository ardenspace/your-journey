/**
 * B4: question bank — human-owned content boundary.
 *
 * v1: chapter 1 (가벼운 오늘), 10 questions. 배열 순서 = 제시 순서.
 * id 규칙 `ch<장>-q<번호>` — 배포 후 id는 영구 계약(문구 수정은 가능,
 * id는 불변). 장 추가는 배열 끝에 이어 붙인다.
 *
 * 톤: 부드러운 존댓말, 답을 강요하지 않는 열린 질문, 가벼운 오늘 주제.
 * 콘텐츠 분석·개인화 없음.
 */
import type { Question } from "../domain/types";

export const QUESTION_BANK: Question[] = [
  {
    id: "ch1-q1",
    chapter: 1,
    order: 1,
    text: "오늘 드신 것 중에 가장 맛있었던 건 무엇이었나요?",
  },
  {
    id: "ch1-q2",
    chapter: 1,
    order: 2,
    text: "오늘 하늘은 어떤 모습이었나요? 잠깐 올려다본 순간이 있으셨다면요.",
  },
  {
    id: "ch1-q3",
    chapter: 1,
    order: 3,
    text: "요즘 자주 흥얼거리게 되는 노래가 있으신가요?",
  },
  {
    id: "ch1-q4",
    chapter: 1,
    order: 4,
    text: "오늘 하루 중 가장 조용했던 순간은 언제였나요?",
  },
  {
    id: "ch1-q5",
    chapter: 1,
    order: 5,
    text: "요즘 챙겨 보시는 드라마나 프로그램이 있다면, 어떤 점이 좋으신가요?",
  },
  {
    id: "ch1-q6",
    chapter: 1,
    order: 6,
    text: "요즘 계절이 바뀌는 걸 어디에서 느끼시나요?",
  },
  {
    id: "ch1-q7",
    chapter: 1,
    order: 7,
    text: "오늘 나눈 대화 중에 기억에 남는 한마디가 있으신가요?",
  },
  {
    id: "ch1-q8",
    chapter: 1,
    order: 8,
    text: "집 안에서 가장 마음이 편해지는 자리는 어디인가요?",
  },
  {
    id: "ch1-q9",
    chapter: 1,
    order: 9,
    text: "오늘 몸이 해 준 일 중에 고마웠던 게 있다면 무엇일까요? 사소한 것도 좋아요.",
  },
  {
    id: "ch1-q10",
    chapter: 1,
    order: 10,
    text: "내일은 어떤 하루였으면 하시나요? 작은 바람 하나면 충분해요.",
  },
];
