import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { NotebookPage } from "../NotebookPage";

const DESIGNS = ["plain", "lined", "grid"] as const;

describe("NotebookPage", () => {
  it.each(DESIGNS)("renders children with %s design", async (design) => {
    const { getByText } = await render(
      <NotebookPage design={design} backgroundColor="#FFFDF7">
        <Text>마음 가는 대로</Text>
      </NotebookPage>,
    );

    expect(getByText("마음 가는 대로")).toBeTruthy();
  });

  it.each(DESIGNS)(
    "keeps children after layout draws the %s pattern",
    async (design) => {
      const { getByTestId, getByText } = await render(
        <NotebookPage design={design} backgroundColor="#EFF5EF" lineSpacing={32}>
          <Text>오늘의 이야기</Text>
        </NotebookPage>,
      );

      await fireEvent(getByTestId("notebook-page"), "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 240 } },
      });

      expect(getByText("오늘의 이야기")).toBeTruthy();
    },
  );
});
