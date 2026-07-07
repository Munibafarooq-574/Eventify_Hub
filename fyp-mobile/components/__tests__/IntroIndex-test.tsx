import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import IntroIndex from "../intro/IntroIndex";
import { Asset } from "expo-asset";
import { router } from "expo-router";

// Mocking dependencies
jest.mock("expo-asset", () => ({
  Asset: {
    fromModule: jest.fn(() => ({ uri: "mocked-image-uri" })),
  },
}));

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

describe("IntroIndex Component", () => {
  it("renders correctly", () => {
    const { getByText } = render(<IntroIndex />);
    expect(getByText("Welcome to Eventify Hub")).toBeTruthy();
    expect(getByText("Create Account")).toBeTruthy();
    expect(getByText("Login")).toBeTruthy();
  });

  it("navigates to select role screen when Create Account button is pressed", () => {
    const { getByText } = render(<IntroIndex />);
    fireEvent.press(getByText("Create Account"));
    expect(router.push).toHaveBeenCalledWith("/selectrole");
  });

  it("navigates to login screen when Login button is pressed", () => {
    const { getByText } = render(<IntroIndex />);
    fireEvent.press(getByText("Login"));
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("loads the image correctly", () => {
    render(<IntroIndex />);
    expect(Asset.fromModule).toHaveBeenCalledWith(expect.anything());
  });
});
