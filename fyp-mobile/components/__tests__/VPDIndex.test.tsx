import React from "react";
import { act } from "react-test-renderer"; // ✅ Add this line
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import PhotographerDetailsScreen from "../VPD/VPDIndex";
import axios from "axios";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as store from "@/store";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useGlobalSearchParams, router } from "expo-router";


// Mock dependencies
jest.mock("axios");
jest.mock("@/store");
jest.mock("expo-router", () => ({
  useGlobalSearchParams: () => ({ id: "mockId" }),
  router: { push: jest.fn(), back: jest.fn() },
}));

const mockVendorData = {
  _id: "vendor1",
  name: "Test Photographer",
  contactDetails: { officialAddress: "123 Street, City" },
  coverImage: "https://example.com/image.jpg",
  images: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
  BusinessDetails: {
    minimumPrice: 15000,
    staff: "3 Members",
    covidRefundPolicy: "Flexible",
    cityCovered: "Karachi, Lahore",
    description: "Professional photographer",
  },
  packages: [
    {
      _id: "pkg1",
      packageName: "Basic Package",
      services: "Photography + Album",
      price: 12000,
    },
  ],
};

describe("PhotographerDetailsScreen", () => {
  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockVendorData });
  });

  it("renders loading state initially", () => {
    const { getByTestId } = render(<PhotographerDetailsScreen />);
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  it("renders error message when vendorData is null", async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: null });
    const { findByTestId } = render(<PhotographerDetailsScreen />);
    expect(await findByTestId("error-message")).toBeTruthy();
  });

  it("shows loading indicator on initial render", () => {
    const { getByTestId } = render(<PhotographerDetailsScreen />);
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

});
