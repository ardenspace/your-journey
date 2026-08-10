import { fireEvent, render } from "@testing-library/react-native";

import type { Diary } from "../../domain/types";
import { DEFAULT_STYLE } from "../../domain/types";
import { DiaryCard } from "../DiaryCard";

// 로컬 정오 기준으로 만들어 이 환경 어디서 돌아도 같은 날짜가 나온다.
const CREATED_AT = new Date(2026, 7, 10, 12, 0).toISOString();

function makeDiary(overrides: Partial<Diary> = {}): Diary {
  return {
    id: "d1",
    title: null,
    content: "오늘은 마당의 감나무를 오래 바라보았다. 바람이 순했다.",
    questionId: null,
    style: DEFAULT_STYLE,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

describe("DiaryCard", () => {
  it("renders the Korean date and a content preview", async () => {
    const { getByText } = await render(
      <DiaryCard diary={makeDiary()} onPress={jest.fn()} />,
    );

    expect(getByText("2026년 8월 10일")).toBeTruthy();
    expect(getByText(/오늘은 마당의 감나무를/)).toBeTruthy();
  });

  it("shows the title when present", async () => {
    const { getByText } = await render(
      <DiaryCard
        diary={makeDiary({ title: "감나무 아래에서" })}
        onPress={jest.fn()}
      />,
    );

    expect(getByText("감나무 아래에서")).toBeTruthy();
  });

  it("does not render a title line when title is null", async () => {
    const { queryByText } = await render(
      <DiaryCard diary={makeDiary()} onPress={jest.fn()} />,
    );

    expect(queryByText("감나무 아래에서")).toBeNull();
  });

  it("truncates long content to about 40 characters", async () => {
    const longContent = "가".repeat(120);
    const { getByText } = await render(
      <DiaryCard
        diary={makeDiary({ content: longContent })}
        onPress={jest.fn()}
      />,
    );

    expect(getByText(`${"가".repeat(40)}…`)).toBeTruthy();
  });

  it("calls onPress when the card is pressed", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <DiaryCard diary={makeDiary()} onPress={onPress} />,
    );

    await fireEvent.press(getByText("2026년 8월 10일"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
