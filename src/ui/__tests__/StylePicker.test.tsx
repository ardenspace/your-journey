import { fireEvent, render } from "@testing-library/react-native";

import { DEFAULT_STYLE } from "../../domain/types";
import { StylePicker } from "../StylePicker";

describe("StylePicker", () => {
  it("pressing 모눈 calls onChange with notebookDesign 'grid'", async () => {
    const onChange = jest.fn();
    const { getByText } = await render(
      <StylePicker style={DEFAULT_STYLE} onChange={onChange} />,
    );

    await fireEvent.press(getByText("모눈"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_STYLE,
      notebookDesign: "grid",
    });
  });

  it("pressing 크게 calls onChange with fontSize 24", async () => {
    const onChange = jest.fn();
    const { getByText } = await render(
      <StylePicker style={DEFAULT_STYLE} onChange={onChange} />,
    );

    await fireEvent.press(getByText("크게"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_STYLE, fontSize: 24 });
  });

  it("pressing a background swatch calls onChange with that backgroundColor", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <StylePicker style={DEFAULT_STYLE} onChange={onChange} />,
    );

    await fireEvent.press(getByTestId("background-#EEF2F7"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_STYLE,
      backgroundColor: "#EEF2F7",
    });
  });

  it("keeps the rest of the style unchanged when one field changes", async () => {
    const onChange = jest.fn();
    const customStyle = {
      ...DEFAULT_STYLE,
      backgroundColor: "#FDF3E7",
      fontSize: 18,
    };
    const { getByText } = await render(
      <StylePicker style={customStyle} onChange={onChange} />,
    );

    await fireEvent.press(getByText("무지"));

    expect(onChange).toHaveBeenCalledWith({
      ...customStyle,
      notebookDesign: "plain",
    });
  });
});
