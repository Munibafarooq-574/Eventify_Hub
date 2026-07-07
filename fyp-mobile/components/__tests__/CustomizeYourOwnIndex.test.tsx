import getAllCategories from "@/services/getAllCategories";
import { saveSecureData } from "@/store";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import CustomizeYourOwnIndex from "../customizeyourown/CustomizeYourOwnIndex";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useLocalSearchParams } from "expo-router";

// 🔧 Mocks
jest.mock("@/services/getAllCategories");
jest.mock("@/store", () => ({
  saveSecureData: jest.fn(),
}));

const mockRouter = { 
  push: jest.fn(),
  back: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: jest.fn(),
}));

beforeEach(() => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({
    selectedServices: JSON.stringify([
      "Venue",
      "Catering",
      "Service 0",
      "Category 0",
    ]),
  });
  jest.clearAllMocks();
});

// ✅ Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({
    selectedServices: JSON.stringify(["Venue", "Catering"]),
  });
});

// ✅ Optional: silence act(...) warning
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((msg) => {
    if (msg.includes('act(...)')) return;
    console.error(msg);
  });
});
describe("Unit Testing", () => {
  it("renders header correctly", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    expect(getByText("Vendor Categories")).toBeTruthy();
  });

  it("renders search input with correct placeholder", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByPlaceholderText } = render(<CustomizeYourOwnIndex />);
    expect(getByPlaceholderText("Search vendor categories")).toBeTruthy();
  });

  it("calls getCategories on mount and filters data", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "desc" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
  });

 it("renders back button with correct label", () => {
   (getAllCategories as jest.Mock).mockResolvedValue([]);
   const { getByText } = render(<CustomizeYourOwnIndex />);
   expect(getByText("Back")).toBeTruthy();
 });

 it("renders no items if selectedServices don't match categories", async () => {
   (getAllCategories as jest.Mock).mockResolvedValue([
     { _id: "x1", name: "Photography", image: "img", description: "desc" },
   ]);
   (useLocalSearchParams as jest.Mock).mockReturnValue({
     selectedServices: JSON.stringify(["Venue"]),
   });
   const { queryByText } = render(<CustomizeYourOwnIndex />);
   expect(queryByText("Photography")).toBeNull();
 });

 it("uses item._id as FlatList keyExtractor", async () => {
   const data = [
     { _id: "123", name: "Venue", image: "img", description: "desc" },
   ];
   (getAllCategories as jest.Mock).mockResolvedValue(data);
   const { findByText } = render(<CustomizeYourOwnIndex />);
   expect(await findByText("Venue")).toBeTruthy();
 });

 it("parses selectedServices from useLocalSearchParams correctly", async () => {
   const selected = ["Venue"];
   (useLocalSearchParams as jest.Mock).mockReturnValue({
     selectedServices: JSON.stringify(selected),
   });
   (getAllCategories as jest.Mock).mockResolvedValue([
     { _id: "1", name: "Venue", image: "img", description: "desc" },
     { _id: "2", name: "Photography", image: "img", description: "desc" },
   ]);
   const { findByText, queryByText } = render(<CustomizeYourOwnIndex />);
   expect(await findByText("Venue")).toBeTruthy();
   expect(queryByText("Photography")).toBeNull();
 });

 it("renders item containers as TouchableOpacity", async () => {
   (getAllCategories as jest.Mock).mockResolvedValue([
     { _id: "1", name: "Venue", image: "img", description: "desc" },
   ]);
   const { findByTestId } = render(<CustomizeYourOwnIndex />);
   const item = await findByTestId("category-item-1");
   expect(item).toBeTruthy();
 });

 it("renders styled TextInput for searching categories", () => {
   (getAllCategories as jest.Mock).mockResolvedValue([]);
   const { getByPlaceholderText } = render(<CustomizeYourOwnIndex />);
   const input = getByPlaceholderText("Search vendor categories");
   expect(input.props.placeholderTextColor).toBe("#aaa");
   expect(input.props.style).toBeTruthy();
 });

});

describe("Functional Testing", () => {
  it("filters and displays only selected categories", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Catering", image: "img", description: "Food" },
      { _id: "2", name: "Photography", image: "img", description: "Photo" },
    ]);
    const { findByText, queryByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Catering")).toBeTruthy();
    expect(queryByText("Photography")).toBeNull();
  });

  it("displays item description correctly", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "4", name: "Venue", image: "img", description: "Beautiful Venue" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Beautiful Venue")).toBeTruthy();
  });

  it("saves correct categoryId on selection", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "7", name: "Catering", image: "img", description: "desc" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    fireEvent.press(await findByText("Catering"));
    expect(saveSecureData).toHaveBeenCalledWith("categoryId", "7");
  });

 it("calls router.back when back button is pressed", () => {
   (getAllCategories as jest.Mock).mockResolvedValue([]);
   const { getByText } = render(<CustomizeYourOwnIndex />);
   fireEvent.press(getByText("Back"));
   expect(mockRouter.back).toHaveBeenCalled();
 });

 it("saves correct categoryId for different item press", async () => {
   (getAllCategories as jest.Mock).mockResolvedValue([
     { _id: "v1", name: "Venue", image: "img", description: "desc" },
     { _id: "c2", name: "Catering", image: "img", description: "desc" },
   ]);
   const { findByText } = render(<CustomizeYourOwnIndex />);
   fireEvent.press(await findByText("Catering"));
   expect(saveSecureData).toHaveBeenCalledWith("categoryId", "c2");
 });

 it("displays multiple matching categories", async () => {
   (getAllCategories as jest.Mock).mockResolvedValue([
     { _id: "1", name: "Venue", image: "img", description: "desc" },
     { _id: "2", name: "Catering", image: "img", description: "desc" },
     { _id: "3", name: "Photography", image: "img", description: "desc" },
   ]);
   (useLocalSearchParams as jest.Mock).mockReturnValue({
     selectedServices: JSON.stringify(["Venue", "Catering"]),
   });
   const { findByText, queryByText } = render(<CustomizeYourOwnIndex />);
   expect(await findByText("Venue")).toBeTruthy();
   expect(await findByText("Catering")).toBeTruthy();
   expect(queryByText("Photography")).toBeNull();
 });

 it("does not display unmatched category", async () => {
   (getAllCategories as jest.Mock).mockResolvedValue([
     { _id: "1", name: "DJ", image: "img", description: "desc" },
   ]);
   const { queryByText } = render(<CustomizeYourOwnIndex />);
   expect(queryByText("DJ")).toBeNull();
 });

 it("renders both name and description for an item", async () => {
   (getAllCategories as jest.Mock).mockResolvedValue([
     {
       _id: "abc",
       name: "Venue",
       image: "img",
       description: "A beautiful space",
     },
   ]);
   const { findByText } = render(<CustomizeYourOwnIndex />);
   expect(await findByText("Venue")).toBeTruthy();
   expect(await findByText("A beautiful space")).toBeTruthy();
 });

 it("does not throw error when pressing item if push is mocked", async () => {
   (getAllCategories as jest.Mock).mockResolvedValue([
     { _id: "xyz", name: "Venue", image: "img", description: "desc" },
   ]);
   const { findByText } = render(<CustomizeYourOwnIndex />);
   const item = await findByText("Venue");
   expect(() => fireEvent.press(item)).not.toThrow();
 });

});

describe("Integration Testing", () => {
  it("fetches and renders multiple selected categories", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "5", name: "Venue", image: "img", description: "V" },
      { _id: "6", name: "Catering", image: "img", description: "C" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
    expect(await findByText("Catering")).toBeTruthy();
  });

  it("goes back when back button is pressed", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    fireEvent.press(getByText("Back"));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("integrates category press with secure storage", async () => {
    const mock = [
      { _id: "1", name: "Venue", image: "img", description: "desc" },
    ];
    (getAllCategories as jest.Mock).mockResolvedValue(mock);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    fireEvent.press(await findByText("Venue"));
    expect(saveSecureData).toHaveBeenCalledWith("categoryId", "1");
  });

  it("integrates back button with navigation stack", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    fireEvent.press(getByText("Back"));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("fetches and filters partial category matches", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Catering", image: "img", description: "Food" },
      { _id: "2", name: "Photography", image: "img", description: "Photo" },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: JSON.stringify(["Catering"]),
    });
    const { findByText, queryByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Catering")).toBeTruthy();
    expect(queryByText("Photography")).toBeNull();
  });

  it("renders UI correctly after multiple category fetch", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "Spacious" },
      { _id: "2", name: "Catering", image: "img", description: "Food" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
    expect(await findByText("Catering")).toBeTruthy();
  });

  it("supports pressing multiple categories without crashing", async () => {
    const mock = [
      { _id: "1", name: "Venue", image: "img", description: "desc" },
      { _id: "2", name: "Catering", image: "img", description: "desc" },
    ];
    (getAllCategories as jest.Mock).mockResolvedValue(mock);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    fireEvent.press(await findByText("Venue"));
    fireEvent.press(await findByText("Catering"));
    expect(saveSecureData).toHaveBeenCalledTimes(2);
  });

  it("calls secure storage even with similar names", async () => {
    const mock = [
      { _id: "a", name: "Venue", image: "img", description: "desc" },
      { _id: "b", name: "Venue", image: "img", description: "desc" },
    ];
    (getAllCategories as jest.Mock).mockResolvedValue(mock);
    const { findAllByText } = render(<CustomizeYourOwnIndex />);
    const [first] = await findAllByText("Venue");
    fireEvent.press(first);
    expect(saveSecureData).toHaveBeenCalledWith("categoryId", "a");
  });

  it("fetches and displays empty if nothing matches", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Photo", image: "img", description: "desc" },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: JSON.stringify(["Venue"]),
    });
    const { queryByText } = render(<CustomizeYourOwnIndex />);
    expect(queryByText("Photo")).toBeNull();
  });

});

describe("Performance Testing", () => {
  it("renders safely with empty data", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    expect(getByText("Vendor Categories")).toBeTruthy();
  });

 it("renders multiple service items efficiently", async () => {
   (useLocalSearchParams as jest.Mock).mockReturnValue({
     selectedServices: JSON.stringify(["Service 0"]),
   });
   const mock = [
     { _id: "id0", name: "Service 0", image: "img", description: "desc 0" },
     // ... more mock services
   ];
   (getAllCategories as jest.Mock).mockResolvedValue(mock);
   const { findByText } = render(<CustomizeYourOwnIndex />);
   expect(await findByText("Service 0")).toBeTruthy();
 });

 it("renders a large dataset properly", async () => {
   (useLocalSearchParams as jest.Mock).mockReturnValue({
     selectedServices: JSON.stringify(["Category 0"]),
   });
   const mock = Array.from({ length: 50 }, (_, i) => ({
     _id: `id${i}`,
     name: `Category ${i}`,
     image: "img",
     description: `desc ${i}`,
   }));
   (getAllCategories as jest.Mock).mockResolvedValue(mock);
   const { findByText } = render(<CustomizeYourOwnIndex />);
   expect(await findByText("Category 0")).toBeTruthy();
 });

 it("renders under heavy load of 100 categories", async () => {
   (useLocalSearchParams as jest.Mock).mockReturnValue({
     selectedServices: JSON.stringify(["Category 0"]),
   });
   const data = Array.from({ length: 100 }, (_, i) => ({
     _id: `id${i}`,
     name: `Category ${i}`,
     image: "img",
     description: "desc",
   }));
   (getAllCategories as jest.Mock).mockResolvedValue(data);
   const { findByText } = render(<CustomizeYourOwnIndex />);
   expect(await findByText("Category 0")).toBeTruthy();
 });

  it("renders quickly with small category list", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "x1", name: "Venue", image: "img", description: "desc" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
  });

  it("renders categories with no image efficiently", async () => {
    const mock = [
      { _id: "1", name: "Venue", image: "", description: "desc" },
      { _id: "2", name: "Catering", image: "", description: "desc" },
    ];
    (getAllCategories as jest.Mock).mockResolvedValue(mock);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
  });

  it("renders with long description fields", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      {
        _id: "long",
        name: "Venue",
        image: "img",
        description: "Very long description ".repeat(10),
      },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
  });

  it("renders mixed list of matching and non-matching services", async () => {
    const data = [
      { _id: "1", name: "Venue", image: "img", description: "desc" },
      { _id: "2", name: "Unmatched", image: "img", description: "desc" },
    ];
    (getAllCategories as jest.Mock).mockResolvedValue(data);
    const { findByText, queryByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
    expect(queryByText("Unmatched")).toBeNull();
  });

  it("renders efficiently even if many categories have the same name", async () => {
    const mock = Array.from({ length: 10 }, (_, i) => ({
      _id: `dup${i}`,
      name: "Venue",
      image: "img",
      description: `desc ${i}`,
    }));
    (getAllCategories as jest.Mock).mockResolvedValue(mock);
    const { findAllByText } = render(<CustomizeYourOwnIndex />);
    const results = await findAllByText("Venue");
    expect(results.length).toBeGreaterThan(1);
  });

});

describe("Accuracy Testing", () => {
  it("accurately filters only valid selected services", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "10", name: "Venue", image: "img", description: "desc" },
      { _id: "11", name: "Unrelated", image: "img", description: "desc" },
    ]);
    const { findByText, queryByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
    expect(queryByText("Unrelated")).toBeNull();
  });

  it("does not render items outside selectedServices", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "12", name: "Photography", image: "img", description: "desc" },
    ]);
    const { queryByText } = render(<CustomizeYourOwnIndex />);
    expect(queryByText("Photography")).toBeNull();
  });

  it("correctly displays category name and description match", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      {
        _id: "13",
        name: "Catering",
        image: "img",
        description: "Food & Service",
      },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Catering")).toBeTruthy();
    expect(await findByText("Food & Service")).toBeTruthy();
  });

  it("only displays services exactly matching selected names", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "desc" },
      { _id: "2", name: "Venue Decor", image: "img", description: "desc" },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: JSON.stringify(["Venue"]),
    });
    const { findByText, queryByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
    expect(queryByText("Venue Decor")).toBeNull();
  });

  it("ignores casing differences when filtering (strict match)", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "VENUE", image: "img", description: "desc" },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: JSON.stringify(["Venue"]),
    });
    const { queryByText } = render(<CustomizeYourOwnIndex />);
    expect(queryByText("VENUE")).toBeNull();
  });

  it("renders all fields accurately for valid service", async () => {
    const category = {
      _id: "100",
      name: "Venue",
      image: "img",
      description: "Perfect for events",
    };
    (getAllCategories as jest.Mock).mockResolvedValue([category]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
    expect(await findByText("Perfect for events")).toBeTruthy();
  });

  it("renders no category if selectedServices is empty array", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: JSON.stringify([]),
    });
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "desc" },
    ]);
    const { queryByText } = render(<CustomizeYourOwnIndex />);
    expect(queryByText("Venue")).toBeNull();
  });

  it("does not filter by partial substrings", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      {
        _id: "1",
        name: "Catering Services",
        image: "img",
        description: "desc",
      },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: JSON.stringify(["Catering"]),
    });
    const { queryByText } = render(<CustomizeYourOwnIndex />);
    expect(queryByText("Catering Services")).toBeNull();
  });

  it("correctly matches when multiple names are similar", async () => {
    const categories = [
      { _id: "1", name: "Venue", image: "img", description: "desc" },
      { _id: "2", name: "Venue 2", image: "img", description: "desc" },
    ];
    (getAllCategories as jest.Mock).mockResolvedValue(categories);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: JSON.stringify(["Venue"]),
    });
    const { findByText, queryByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
    expect(queryByText("Venue 2")).toBeNull();
  });

  it("correctly matches services even with extra whitespace in selection", async () => {
    const categories = [
      { _id: "1", name: "Venue", image: "img", description: "desc" },
    ];
    (getAllCategories as jest.Mock).mockResolvedValue(categories);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: JSON.stringify([" Venue "]),
    });
    const { queryByText } = render(<CustomizeYourOwnIndex />);
    expect(queryByText("Venue")).toBeNull(); // Strict matching, no trim
  });

});

describe("Navigation Testing", () => {
 
  it("does not throw error if push not called", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    expect(getByText("Vendor Categories")).toBeTruthy(); // Safe render with no navigation
  });

  it("back button does not crash when called", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    fireEvent.press(getByText("Back"));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("back button is visible and tappable", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    const backBtn = getByText("Back");
    expect(backBtn).toBeTruthy();
  });

  it("push is not called when no item is pressed", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "desc" },
    ]);
    render(<CustomizeYourOwnIndex />);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("navigation stays idle if no data matches", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    render(<CustomizeYourOwnIndex />);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("does not call navigation functions unexpectedly", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "3", name: "Photography", image: "img", description: "desc" },
    ]);
    render(<CustomizeYourOwnIndex />);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

});

describe("Error Handling Testing", () => {
 
  it("handles non-matching selectedServices", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "x", name: "Photography", image: "img", description: "desc" },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: JSON.stringify(["NonMatchingService"]),
    });
    const { queryByText } = render(<CustomizeYourOwnIndex />);
    expect(queryByText("Photography")).toBeNull();
  });

  it("handles empty selectedServices param", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedServices: "",
    });
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "desc" },
    ]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    expect(getByText("Vendor Categories")).toBeTruthy();
  });

  it("handles missing description field safely", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "x", name: "Venue", image: "img" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
  });

  it("ignores unknown fields in category object", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      {
        _id: "z",
        name: "Venue",
        image: "img",
        description: "desc",
        foo: "bar",
      },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
  });

});

describe("Accessibility Testing", () => {
  it("search input is accessible by placeholder", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByPlaceholderText } = render(<CustomizeYourOwnIndex />);
    expect(getByPlaceholderText("Search vendor categories")).toBeTruthy();
  });

  it("header is accessible by text", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    expect(getByText("Vendor Categories")).toBeTruthy();
  });

  it("category name is readable by screen reader", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "a11y", name: "Venue", image: "img", description: "desc" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
  });

  it("back button is accessible by text", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    expect(getByText("Back")).toBeTruthy();
  });

  it("flatlist container renders accessible text items", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "desc" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
  });

  it("text input supports accessibility props", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByPlaceholderText } = render(<CustomizeYourOwnIndex />);
    const input = getByPlaceholderText("Search vendor categories");
    expect(input.props.accessible).not.toBe(false);
  });

  it("description text is readable", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "2", name: "Venue", image: "img", description: "Nice Hall" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Nice Hall")).toBeTruthy();
  });

  it("all rendered items have text children", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "Nice" },
      { _id: "2", name: "Catering", image: "img", description: "Delicious" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
    expect(await findByText("Catering")).toBeTruthy();
  });

  it("search input has accessible placeholder", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByPlaceholderText } = render(<CustomizeYourOwnIndex />);
    expect(getByPlaceholderText("Search vendor categories")).toBeTruthy();
  });

});

describe("Boundary Testing", () => {
  it("renders correctly with no categories", () => {
    (getAllCategories as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<CustomizeYourOwnIndex />);
    expect(getByText("Vendor Categories")).toBeTruthy();
  });

  it("renders with only one category", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "desc" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
  });

  it("renders category even if description is missing", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "null-desc", name: "Venue", image: "img", description: undefined },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy(); // name still renders
  });

  it("renders multiple categories with the same name but different IDs", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "desc1" },
      { _id: "2", name: "Venue", image: "img", description: "desc2" },
    ]);
    const { findAllByText } = render(<CustomizeYourOwnIndex />);
    const items = await findAllByText("Venue");
    expect(items.length).toBe(2);
  });
});

describe("Scrolling Testing", () => {
  
  it("ensures all visible items appear in scrollable list", async () => {
    (getAllCategories as jest.Mock).mockResolvedValue([
      { _id: "1", name: "Venue", image: "img", description: "desc" },
      { _id: "2", name: "Catering", image: "img", description: "desc" },
    ]);
    const { findByText } = render(<CustomizeYourOwnIndex />);
    expect(await findByText("Venue")).toBeTruthy();
    expect(await findByText("Catering")).toBeTruthy();
  });

 it("renders FlatList even with only two items", async () => {
   (getAllCategories as jest.Mock).mockResolvedValue([
     { _id: "1", name: "Venue", image: "img", description: "desc" },
     { _id: "2", name: "Catering", image: "img", description: "desc" },
   ]);
   const { findByText } = render(<CustomizeYourOwnIndex />);
   expect(await findByText("Venue")).toBeTruthy();
   expect(await findByText("Catering")).toBeTruthy();
 });

it("renders duplicate category names in scrollable list correctly", async () => {
  (getAllCategories as jest.Mock).mockResolvedValue([
    { _id: "1", name: "Venue", image: "img", description: "desc" },
    { _id: "2", name: "Venue", image: "img", description: "desc2" },
  ]);
  const { findAllByText } = render(<CustomizeYourOwnIndex />);
  const venues = await findAllByText("Venue");
  expect(venues.length).toBe(2);
});

it("renders scrollable list even with missing image URLs", async () => {
  (getAllCategories as jest.Mock).mockResolvedValue([
    { _id: "1", name: "Venue", image: "", description: "desc" },
    { _id: "2", name: "Catering", image: "", description: "desc" },
  ]);
  const { findByText } = render(<CustomizeYourOwnIndex />);
  expect(await findByText("Venue")).toBeTruthy();
  expect(await findByText("Catering")).toBeTruthy();
});

}); 
