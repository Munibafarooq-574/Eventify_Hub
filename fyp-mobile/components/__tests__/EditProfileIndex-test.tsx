import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import EditProfileScreen from "../editprofile/EditProfileIndex"; // ✅ Adjust path if needed
import * as store from "@/store";
import patchUpdateProfile from "@/services/patchUpdateProfile";

// ✅ Mock necessary modules
jest.mock("@/store", () => ({
  getSecureData: jest.fn(),
  saveSecureData: jest.fn(),
}));

jest.mock("@/services/patchUpdateProfile", () => jest.fn());

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
}));

// ✅ Properly mock global alert
beforeAll(() => {
  global.alert = jest.fn();
});

describe("EditProfileScreen - Simple Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // ✅ Default mock for getSecureData("user") – used in both EditProfileScreen + BottomNavigationFinal
    (store.getSecureData as jest.Mock).mockImplementation((key) => {
      if (key === "user") {
        return Promise.resolve(JSON.stringify({
          _id: "u001",
          role: "vendor",
          name: "Ali Khan",
          email: "ali@example.com",
          phoneNumber: "3001234567",
          address: "Islamabad",
        }));
      }
      return Promise.resolve(null);
    });
  });

  it("renders Edit Profile screen", () => {
    const { getByText } = render(<EditProfileScreen />);
    expect(getByText("Edit Profile")).toBeTruthy();
  });

  it("renders Save button", () => {
    const { getByText } = render(<EditProfileScreen />);
    expect(getByText("SAVE")).toBeTruthy();
  });

  it("displays correct avatar letter from name", async () => {
    const { findByText } = render(<EditProfileScreen />);
    expect(await findByText("A")).toBeTruthy(); // A from Ali
  });

  it("updates name field", () => {
    const { getByPlaceholderText } = render(<EditProfileScreen />);
    const nameInput = getByPlaceholderText("Enter your name");
    fireEvent.changeText(nameInput, "Zara");
    expect(nameInput.props.value).toBe("Zara");
  });

  it("updates email field", () => {
    const { getByPlaceholderText } = render(<EditProfileScreen />);
    const emailInput = getByPlaceholderText("Enter your email");
    fireEvent.changeText(emailInput, "zara@example.com");
    expect(emailInput.props.value).toBe("zara@example.com");
  });

  it("updates phone number", () => {
    const { getByPlaceholderText } = render(<EditProfileScreen />);
    const phoneInput = getByPlaceholderText("Enter phone number");
    fireEvent.changeText(phoneInput, "3123456789");
    expect(phoneInput.props.value).toBe("3123456789");
  });

});
