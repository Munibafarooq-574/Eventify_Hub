import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Sandwich3Index from "../sandwich3/Sandwich3Index";
import { router } from "expo-router";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() }, // Mock router.push function
}));

describe("Sandwich3Index Screen", () => {
  test("renders all UI elements correctly", async () => {
    const { getByText } = await render(<Sandwich3Index />);

    // Title has nested text, so use partial matches with regex
    // Checking for "ENJOY EVERY MOMENT" and "EVENT PLANNERS!" portions:
    expect(getByText(/ENJOY EVERY MOMENT/)).toBeTruthy();
    expect(getByText(/EVENT PLANNERS!/)).toBeTruthy();

    // Check Description
    // "Let top event planners handle the details, so you can focus on enjoying your special day."
    // The provided text is:
    // "Let top event planners handle the details, so you can focus on enjoying your special day."
    // We'll match a unique part of this sentence to ensure it’s rendered.
    expect(getByText(/Let top event planners handle the details/)).toBeTruthy();

    // Check the "Get Started" button text
    expect(getByText("Get Started")).toBeTruthy();
  });

  test("navigates to /intro when Get Started is pressed", async () => {
    const { getByText } = await render(<Sandwich3Index />);
    const getStartedButton = getByText("Get Started");
    await fireEvent.press(getStartedButton);
    expect(router.push).toHaveBeenCalledWith("/intro");
  });

  // Optional: Snapshot test to ensure UI consistency
  test("matches the snapshot", async () => {
    const { toJSON } = await render(<Sandwich3Index />);
    expect(toJSON()).toMatchSnapshot();
  });

  test("does not render irrelevant text", async () => {
    const { queryByText } = await render(<Sandwich3Index />);
    expect(queryByText("This text should not be here")).toBeNull();
  });
  test("checks highlight text presence", async () => {
    const { getByText } = await render(<Sandwich3Index />);
    // Check a unique word in highlight text
    expect(getByText(/EVENT PLANNERS!/)).toBeTruthy();
  });
  test("description contains specific phrases", async () => {
    const { getByText } = await render(<Sandwich3Index />);
    expect(getByText(/Let top event planners handle the details/)).toBeTruthy();
    expect(
      getByText(/so you can focus on enjoying your special day/)
    ).toBeTruthy();
  });
  test("button text is correct", async () => {
    const { getByText } = await render(<Sandwich3Index />);
    expect(getByText(/Get Started/)).toBeTruthy();
  });
    test("UI does not change unexpectedly", async () => {
      const { toJSON } = await render(<Sandwich3Index />);
      expect(toJSON()).toMatchSnapshot();
    });
  test("no other route is called on button press", async () => {
    const { getByText } = await render(<Sandwich3Index />);
    const getStartedButton = getByText("Get Started");
    await fireEvent.press(getStartedButton);
    // Expect correct route
    expect(router.push).toHaveBeenCalledWith("/intro");
    // Check koi aur route call na hua
    expect(router.push).not.toHaveBeenCalledWith("/sandwich2");
  });
});
