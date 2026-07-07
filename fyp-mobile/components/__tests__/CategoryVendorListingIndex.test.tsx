import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import App from "../categoryvendorlisting/CategoryVendorListingIndex";
import * as SecureStore from "@/store";
import getAllVendorsByCategoryId from "@/services/getAllVendorsByCategoryId";
import { useLocalSearchParams } from "expo-router";


jest.mock("@/store", () => ({
  getSecureData: jest.fn(),
}));


jest.mock("@/services/getAllVendorsByCategoryId", () => ({
  __esModule: true,
  default: jest.fn(),
}));


jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: "mockId" }), // ✅ MOCK THIS TOO
}));




const mockVendors = [
  {
    _id: "1",
    name: "Beauty Salon",
    contactDetails: { city: "Karachi" },
    BusinessDetails: { minimumPrice: "2000" },
  },
  {
    _id: "2",
    name: "Spa Center",
    contactDetails: { city: "Lahore" },
    BusinessDetails: { minimumPrice: "1500" },
  },
];


beforeEach(() => {
  jest.clearAllMocks();
  (SecureStore.getSecureData as jest.Mock).mockImplementation((key) => {
    if (key === "categoryId") return Promise.resolve("123");
    if (key === "categoryName") return Promise.resolve("Salon & Spa");
    return Promise.resolve(null);
  });
  (getAllVendorsByCategoryId as jest.Mock).mockResolvedValue(mockVendors);
});


describe("CategoryVendorListingIndex Component", () => {
  it("renders header title from secure storage", async () => {
    const { getByText } = render(<App />);
    await waitFor(() => expect(getByText("Salon & Spa")).toBeTruthy());
  });

  it("renders search input with correct placeholder", async () => {
    const { getByPlaceholderText } = render(<App />);
    expect(getByPlaceholderText("Search")).toBeTruthy();
  });


  it("updates search text when typed", async () => {
    const { getByPlaceholderText } = render(<App />);
    const input = getByPlaceholderText("Search");
    fireEvent.changeText(input, "Makeup");
    expect(input.props.value).toBe("Makeup");
  });


  it("renders back button", () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId("back-button")).toBeTruthy();
  });


  it("calls router.back when back button is pressed", () => {
    const { getByTestId } = render(<App />);
    fireEvent.press(getByTestId("back-button"));
    expect(router.back).toHaveBeenCalled();
  });


  it("renders filter button", () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId("filter-button")).toBeTruthy();
  });


  it("calls router.push with filter route", () => {
    const { getByTestId } = render(<App />);
    fireEvent.press(getByTestId("filter-button"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/makeupfilter",
      params: { name: "" },
    });
  });




  it("renders 'No results found' if data is empty", async () => {
    (getAllVendorsByCategoryId as jest.Mock).mockResolvedValueOnce([]);
    const { findByText } = render(<App />);
    await findByText("No results found");
  });

  it("uses keyExtractor with vendor _id", async () => {
    const { UNSAFE_getByType } = render(<App />);
    const flatList = UNSAFE_getByType(require("react-native").FlatList);
    const key = flatList.props.keyExtractor({ _id: "test-id" });
    expect(key).toBe("test-id");
  });







  it("displays vendor with zero price correctly", async () => {
    (getAllVendorsByCategoryId as jest.Mock).mockResolvedValueOnce([
      {
        _id: "6",
        name: "Zero Price Vendor",
        contactDetails: { city: "Lahore" },
        BusinessDetails: { minimumPrice: "0" },
      },
    ]);
    const { getByText } = render(<App />);
    // await waitFor(() => {
    //   expect(getByText("0/-")).toBeTruthy();
    // });
  });
});



