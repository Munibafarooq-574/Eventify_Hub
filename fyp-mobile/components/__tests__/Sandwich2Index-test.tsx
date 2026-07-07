import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Sandwich2Index from "../sandwich2/Sandwich2Index";
import { router } from "expo-router";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() }, // Mock router.push function
}));

test("renders all UI elements correctly", () => {
  const { getByText } = render(<Sandwich2Index />);

  // Title and nested text via regex
  expect(getByText(/YOUR/)).toBeTruthy();
  expect(getByText(/DREAM EVENT/)).toBeTruthy();
  expect(getByText(/ONE VENDOR AWAY/)).toBeTruthy();

  // Description
  expect(
    getByText(/Seamlessly find, connect, and book your ideal vendor/)
  ).toBeTruthy();

  // SKIP and NEXT buttons
  expect(getByText("SKIP")).toBeTruthy();
  expect(getByText("NEXT")).toBeTruthy();
});

test("navigates to /intro when SKIP is pressed", () => {
  const { getByText } = render(<Sandwich2Index />);
  const skipButton = getByText("SKIP");
  fireEvent.press(skipButton);
  expect(router.push).toHaveBeenCalledWith("/intro");
});

test("navigates to /sandwich3 when NEXT is pressed", () => {
  const { getByText } = render(<Sandwich2Index />);
  const nextButton = getByText("NEXT");
  fireEvent.press(nextButton);
  expect(router.push).toHaveBeenCalledWith("/sandwich3");
});
