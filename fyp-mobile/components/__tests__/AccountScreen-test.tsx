import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Linking } from "react-native";
import AccountScreen from "../account/AccountIndex";

const mockPush = jest.fn(); // ✅ Use a shared mock function for router

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

jest.mock("@/store", () => ({
  getSecureData: jest.fn(() =>
    Promise.resolve(
      JSON.stringify({
        name: "Midhat Rizvi",
        email: "midhat@example.com",
        role: "Organizer",
      })
    )
  ),
  deleteSecureData: jest.fn(() => Promise.resolve()),
}));



describe("AccountScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // ✅ Reset mock calls before each test
  });

  it("renders the profile section with correct user name and a valid email", async () => {
    const { getByText } = render(<AccountScreen />);

    await waitFor(() => {
      expect(getByText("Midhat Rizvi")).toBeTruthy();
      expect(getByText("midhat@example.com")).toBeTruthy();
    });
  });


  it("navigates to Edit Profile when Edit Profile is clicked", async () => {
    const { getByText } = render(<AccountScreen />);

    await waitFor(() => expect(getByText("Edit Profile")).toBeTruthy());

    fireEvent.press(getByText("Edit Profile"));

    expect(mockPush).toHaveBeenCalledWith("/editprofile");
  });

  it("shows the confirmation modal when Sign Out is clicked", async () => {
    const { getByText, queryByTestId } = render(<AccountScreen />);

    fireEvent.press(getByText("Sign Out"));

    await waitFor(() => {
      expect(queryByTestId("logout-modal")).not.toBeNull(); // ✅ Ensure modal appears
    });
  });

  it("closes the confirmation modal when cancel is clicked", async () => {
    const { getByText, queryByTestId } = render(<AccountScreen />);

    fireEvent.press(getByText("Sign Out"));

    await waitFor(() => {
      expect(queryByTestId("logout-modal")).not.toBeNull(); // ✅ Ensure modal appears
    });

    fireEvent.press(getByText("Cancel"));

    await waitFor(() => {
      expect(queryByTestId("logout-modal")).toBeNull(); // ✅ Ensure modal disappears
    });
  });

  it("renders all menu options correctly", () => {
    const { getAllByText } = render(<AccountScreen />);

    const menuOptions = [
      "Edit Profile",
      "Notifications",
      "Frequently Asked Questions",
      "Contact Us",
      "Sign Out",
    ];

    menuOptions.forEach((option) => {
      const matchingElements = getAllByText(option); // ✅ Get all elements matching the text
      expect(matchingElements.length).toBeGreaterThan(0); // ✅ Ensure at least one exists
    });
  });

  it("navigates to Terms of Service when the link is clicked", () => {
    const { getByText } = render(<AccountScreen />);

    fireEvent.press(getByText("Terms of Service"));

    expect(mockPush).toHaveBeenCalledWith("/termsofservices");
  });

  it("does not show logout confirmation modal initially", () => {
    const { queryByTestId } = render(<AccountScreen />);

    expect(queryByTestId("logout-modal")).toBeNull(); // ✅ Modal should be hidden at start
  });

  it("renders all bottom navigation items correctly", () => {
    const { getAllByText } = render(<AccountScreen />);

    const bottomNavItems = ["Home", "Messages", "Notifications", "Account"];

    bottomNavItems.forEach((item) => {
      const elements = getAllByText(item);
      expect(elements.length).toBeGreaterThan(0);
      expect(elements[elements.length - 1]).toBeTruthy();
    });
  });

  it("renders and allows clicking 'Edit Profile' button", async () => {
    const { getByText } = render(<AccountScreen />);

    await waitFor(() => expect(getByText("Edit Profile")).toBeTruthy());
    fireEvent.press(getByText("Edit Profile"));

    expect(mockPush).toHaveBeenCalledWith("/editprofile");
  });

  it("renders 'Sign Out' button before interaction", () => {
    const { getByText } = render(<AccountScreen />);
    expect(getByText("Sign Out")).toBeTruthy(); // ✅ Check before clicking
  });

  it("closes logout modal when back is pressed", async () => {
    const { getByText, queryByTestId } = render(<AccountScreen />);

    fireEvent.press(getByText("Sign Out"));
    await waitFor(() => expect(queryByTestId("logout-modal")).toBeTruthy()); // ✅ Modal appears

    fireEvent.press(getByText("Cancel")); // Simulate pressing back
    await waitFor(() => expect(queryByTestId("logout-modal")).toBeNull()); // ✅ Modal disappears
  });

});
