import { render } from "@testing-library/react-native";

import { JourneyPath } from "../JourneyPath";

describe("JourneyPath", () => {
  it("count 0 shows the first-step invitation", async () => {
    const { getByText } = await render(<JourneyPath count={0} />);

    expect(getByText("오늘, 첫 걸음을 시작해 보세요")).toBeTruthy();
  });

  it("count 5 shows the encouragement copy", async () => {
    const { getByText } = await render(<JourneyPath count={5} />);

    expect(getByText("여기까지 걸어오셨어요")).toBeTruthy();
  });

  it("never renders digits — no numbers or statistics (Requirement 4)", async () => {
    for (const count of [0, 1, 5, 100, 400]) {
      const { queryByText, unmount } = await render(
        <JourneyPath count={count} />,
      );

      expect(queryByText(/\d/)).toBeNull();

      await unmount();
    }
  });
});
