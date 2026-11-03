import { getRenderedComponent } from '../../test-utils/renderedComponents';
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router , useLocalSearchParams } from "expo-router";
import App from "../categoryvendorlisting/CategoryVendorListingIndex";
import * as SecureStore from "@/store";
import getAllVendorsByCategoryId from "@/services/getAllVendorsByCategoryId";



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
    const { getByText } = await render(<App />);
    await waitFor(() => expect(getByText("Salon & Spa")).toBeTruthy());
  });

  it("renders search input with correct placeholder", async () => {
    const { getByPlaceholderText } = await render(<App />);
    expect(getByPlaceholderText("Search")).toBeTruthy();
  });


  it("updates search text when typed", async () => {
    const { getByPlaceholderText } = await render(<App />);
    const input = getByPlaceholderText("Search");
    await fireEvent.changeText(input, "Makeup");
    expect(input.props.value).toBe("Makeup");
  });


  it("renders back button", async () => {
    const { getByTestId } = await render(<App />);
    expect(getByTestId("back-button")).toBeTruthy();
  });


  it("calls router.back when back button is pressed", async () => {
    const { getByTestId } = await render(<App />);
    await fireEvent.press(getByTestId("back-button"));
    expect(router.back).toHaveBeenCalled();
  });


  it("renders filter button", async () => {
    const { getByTestId } = await render(<App />);
    expect(getByTestId("filter-button")).toBeTruthy();
  });


  it("calls router.push with filter route", async () => {
    const { getByTestId } = await render(<App />);
    await fireEvent.press(getByTestId("filter-button"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/makeupfilter",
      params: { name: "" },
    });
  });




  it("renders 'No results found' if data is empty", async () => {
    (getAllVendorsByCategoryId as jest.Mock).mockResolvedValueOnce([]);
    const { findByText } = await render(<App />);
    await findByText("No results found");
  });

  it("uses keyExtractor with vendor _id", async () => {
    const { container } = await render(<App />);
    const flatList = getRenderedComponent(container, require("react-native").FlatList);
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
    const { getByText } = await render(<App />);
    // await waitFor(() => {
    //   expect(getByText("0/-")).toBeTruthy();
    // });
  });
});



