import { render, screen, waitFor } from "@testing-library/react-native";
import axios from "axios";
import React from "react";
import PhotographerDetailsScreen from "../vendorprofiledetails/VendorProfileDetailsIndex"; // Adjust path if needed

// Mocking axios for API calls with correct typing
jest.mock("axios");
const mockAxios = axios as jest.Mocked<typeof axios>;

// Mocking useGlobalSearchParams from expo-router correctly
jest.mock("expo-router", () => ({
  useGlobalSearchParams: jest.fn().mockReturnValue({ id: "123" }), // Mock the return value of useGlobalSearchParams
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

describe("PhotographerDetailsScreen Component Tests", () => {
  it("should render loading indicator when data is being fetched", () => {
    render(<PhotographerDetailsScreen />);
    const loadingIndicator = screen.getByTestId("loading-indicator");
    expect(loadingIndicator).toBeTruthy();
  });

  it("should render an error message if vendor data is not available", async () => {
    // Mocking rejected API call to simulate failure
    mockAxios.get.mockRejectedValue(new Error("Failed to fetch"));

    render(<PhotographerDetailsScreen />);
    const errorMessage = await screen.findByTestId("error-message");
    expect(errorMessage).toHaveTextContent(
      "Failed to load vendor details. Please try again."
    );
  });

  it("displays error message when data fetching fails", async () => {
    mockAxios.get.mockRejectedValueOnce(new Error("Failed to fetch data"));
    render(<PhotographerDetailsScreen />);

    await waitFor(() => screen.getByTestId("error-message"));

    expect(screen.getByTestId("error-message")).toBeTruthy();
    expect(
      screen.getByText("Failed to load vendor details. Please try again.")
    ).toBeTruthy();
  });
});
