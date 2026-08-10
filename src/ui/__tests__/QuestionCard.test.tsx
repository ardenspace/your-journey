import { fireEvent, render } from "@testing-library/react-native";

import type { Question } from "../../domain/types";
import { QuestionCard } from "../QuestionCard";

const question: Question = {
  id: "ch1-q1",
  chapter: 1,
  order: 1,
  text: "오늘 드신 것 중에 가장 맛있었던 건 무엇이었나요?",
};

describe("QuestionCard", () => {
  it("renders the question text", async () => {
    const { getByText } = await render(
      <QuestionCard question={question} onWrite={jest.fn()} />,
    );

    expect(
      getByText("오늘 드신 것 중에 가장 맛있었던 건 무엇이었나요?"),
    ).toBeTruthy();
  });

  it("pressing the write button fires onWrite", async () => {
    const onWrite = jest.fn();
    const { getByText } = await render(
      <QuestionCard question={question} onWrite={onWrite} />,
    );

    await fireEvent.press(getByText("이 이야기 써 볼까요?"));

    expect(onWrite).toHaveBeenCalledTimes(1);
  });
});
