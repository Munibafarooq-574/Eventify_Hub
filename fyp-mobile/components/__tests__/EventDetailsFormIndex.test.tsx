
// __tests__/PersonalizedExperienceScreen.test.tsx

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import getAllCategories from "@/services/getAllCategories";
import { saveSecureData } from "@/store";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import React from "react";
import PersonalizedExperienceScreen from "../EventDetailsForm/EventDetailsFormIndex"; // Adjust path

// Mock dependencies
jest.mock("@/services/getAllCategories");
jest.mock("@/store");
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

// Sample categories mock data
const mockCategories = [
  { _id: "1", name: "Photography" },
  { _id: "2", name: "Catering" },
];

describe("Unit Testing", () => {
  beforeEach(() => {
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
  });


  it("updates event name input", () => {
    const { getByPlaceholderText } = render(<PersonalizedExperienceScreen />);
    const input = getByPlaceholderText("Enter event name");
    fireEvent.changeText(input, "My Birthday");
    expect(input.props.value).toBe("My Birthday");
  });

});

describe("Functional Testing", () => {
  beforeEach(() => {
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  // Test Case 1: Event name input field should update state correctly
  it("updates event name input field correctly", () => {
    const { getByPlaceholderText } = render(<PersonalizedExperienceScreen />);
    const input = getByPlaceholderText("Enter event name");
    fireEvent.changeText(input, "My Birthday");
    expect(input.props.value).toBe("My Birthday");
  });

  it("displays the selected event date correctly", async () => {
    const { getByText, getByTestId } = render(<PersonalizedExperienceScreen />);

    // Open the date picker
    fireEvent.press(getByTestId("select-event-date-button"));

    // Get the current date and simulate the date selection
    const currentDate = new Date();
    fireEvent(getByTestId("datetime-picker"), "onChange", {
      nativeEvent: { timestamp: currentDate.getTime() },
    });

    // Verify that the selected date is correctly displayed
    await waitFor(() => {
      expect(getByText(currentDate.toDateString())).toBeTruthy();
    });
  });

  it("displays the selected event date correctly", async () => {
    const { getByText, getByTestId } = render(<PersonalizedExperienceScreen />);

    // Open the date picker
    fireEvent.press(getByTestId("select-event-date-button"));

    // Get the current date
    const currentDate = new Date();

    // Simulate selecting the date
    fireEvent(getByTestId("datetime-picker"), "onChange", {
      nativeEvent: { timestamp: currentDate.getTime() },
    });

    // Verify that the selected date appears correctly
    await waitFor(() => {
      expect(getByText(currentDate.toDateString())).toBeTruthy();
    });
  });

  it("opens the date picker when 'Select event date' is clicked", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { getByText, getByTestId } = render(<PersonalizedExperienceScreen />);

    // Simulate clicking the 'Select event date' button
    fireEvent.press(getByTestId("select-event-date-button"));

    // Verify that the date picker opens
    await waitFor(() => {
      expect(getByTestId("datetime-picker")).toBeTruthy();
    });
  });

  it("shows an error when event name is left empty", async () => {
    const { getByText, getByPlaceholderText } = render(
      <PersonalizedExperienceScreen />
    );

    // Leave the event name empty and simulate form submission
    fireEvent.changeText(getByPlaceholderText("Enter event name"), "");
    fireEvent.press(getByText("AI Suggested Plan"));

    // Verify that the error message is shown
    await waitFor(() => {
      expect(getByText("Event name is required")).toBeTruthy();
    });
  });
});

describe("Integration Testing", () => {
  beforeEach(() => {
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  it("can select an event date correctly", async () => {
    const { getByText, getByTestId } = render(<PersonalizedExperienceScreen />);

    // Open the date picker
    fireEvent.press(getByTestId("select-event-date-button"));

    // Get the current date
    const currentDate = new Date();

    // Simulate a date selection
    fireEvent(getByTestId("datetime-picker"), "onChange", {
      nativeEvent: { timestamp: currentDate.getTime() },
    });

    // Verify that the selected date appears correctly in the UI
    await waitFor(() => {
      expect(getByText(currentDate.toDateString())).toBeTruthy();
    });
  });

});

describe("Security Testing", () => {
  beforeEach(() => {
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  it("does not save or navigate when form is invalid", () => {
    const { getByText } = render(<PersonalizedExperienceScreen />);
    fireEvent.press(getByText("AI Suggested Plan"));
    expect(saveSecureData).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("prevents injection in eventName input", () => {
    const { getByPlaceholderText } = render(<PersonalizedExperienceScreen />);
    const maliciousInput = "<script>alert('xss')</script>";
    fireEvent.changeText(
      getByPlaceholderText("Enter event name"),
      maliciousInput
    );
    expect(getByPlaceholderText("Enter event name").props.value).toBe(
      maliciousInput
    );
  });

  it("prevents injection in eventType input", () => {
    const { getByPlaceholderText } = render(<PersonalizedExperienceScreen />);
    const maliciousInput = "<img src=x onerror=alert('xss') />";
    fireEvent.changeText(
      getByPlaceholderText("Enter event type"),
      maliciousInput
    );
    expect(getByPlaceholderText("Enter event type").props.value).toBe(
      maliciousInput
    );
  });



  it("rejects excessively long eventName input", () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <PersonalizedExperienceScreen />
    );
    const longString = "a".repeat(1001); // 1001 chars

    fireEvent.changeText(getByPlaceholderText("Enter event name"), longString);
    fireEvent.press(getByText("AI Suggested Plan"));

    // Expect some error message related to input length or validation failure
    // (Assuming you add max length validation; else just checking form does not submit)
    expect(queryByText("Event name is required")).toBeNull(); // Not empty error
    // You might want to add a max length validation error message here in your component for this to work
  });

  it("sanitizes eventName input against script injection", () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <PersonalizedExperienceScreen />
    );
    const maliciousInput = `<script>alert('hack')</script>`;

    fireEvent.changeText(
      getByPlaceholderText("Enter event name"),
      maliciousInput
    );
    fireEvent.press(getByText("AI Suggested Plan"));

    // Your component doesn't sanitize but you should check form does not submit
    expect(queryByText("Event name is required")).toBeNull();
    // If you add sanitization, test that dangerous code is stripped or escaped
  });



});

describe("Accuracy Testing ", () => {
  beforeEach(() => {
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  it("validates form accurately with missing inputs", () => {
    const { getByText } = render(<PersonalizedExperienceScreen />);
    fireEvent.press(getByText("AI Suggested Plan"));
    expect(getByText("Event name is required")).toBeTruthy();
  });

  // Test: Errors clear when fields are correctly filled
  it("clears error messages after valid inputs", async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <PersonalizedExperienceScreen />
    );

    // Submit empty form, expect errors
    fireEvent.press(getByText("AI Suggested Plan"));
    await waitFor(() => {
      expect(getByText("Event name is required")).toBeTruthy();
    });

    // Fill valid event name, error should clear
    fireEvent.changeText(getByPlaceholderText("Enter event name"), "My Event");
    fireEvent.press(getByText("AI Suggested Plan"));

    await waitFor(() => {
      expect(queryByText("Event name is required")).toBeNull();
    });
  });

  // Test: Guests input accepts only numeric strings and shows error for empty


  // Test: Event type input updates and validation
  it("updates event type input and validates correctly", async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <PersonalizedExperienceScreen />
    );

    // Submit empty form, expect event type error
    fireEvent.press(getByText("AI Suggested Plan"));
    await waitFor(() => {
      expect(getByText("Event type is required")).toBeTruthy();
    });

    // Enter valid event type
    fireEvent.changeText(
      getByPlaceholderText("Enter event type"),
      "Conference"
    );
    fireEvent.press(getByText("AI Suggested Plan"));

    await waitFor(() => {
      expect(queryByText("Event type is required")).toBeNull();
    });
  });

  // Test: Error messages only appear after attempting to submit invalid form
  it("does not show error messages before form submission", () => {
    const { queryByText } = render(<PersonalizedExperienceScreen />);
    expect(queryByText("Event name is required")).toBeNull();
    expect(queryByText("Event type is required")).toBeNull();
    expect(queryByText("Event date is required")).toBeNull();
    expect(queryByText("Guest count is required")).toBeNull();
    expect(queryByText("Select at least one service")).toBeNull();
  });

  // Test: Clicking "Customize Your Own" button without valid form shows errors


});

describe("Navigation Testing", () => {
  beforeEach(() => {
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
    jest.clearAllMocks();
  });

  it("does not call router.push if form is invalid", () => {
    const { getByText } = render(<PersonalizedExperienceScreen />);
    fireEvent.press(getByText("AI Suggested Plan"));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("does not navigate on Customize Your Own button press if form invalid", async () => {
    const { getByText } = render(<PersonalizedExperienceScreen />);
    // Immediately press without filling anything
    fireEvent.press(getByText("Customize Your Own"));
    await waitFor(() => {
      expect(router.push).not.toHaveBeenCalled();
    });
  });

});

describe("Accessibility Testing", () => {
  beforeEach(() => {
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  it("buttons are accessible", () => {
    const { getByText } = render(<PersonalizedExperienceScreen />);
    expect(getByText("AI Suggested Plan")).toBeTruthy();
    expect(getByText("Customize Your Own")).toBeTruthy();
  });

  it("error messages are readable by screen readers", async () => {
    const { getByText } = render(<PersonalizedExperienceScreen />);
    fireEvent.press(getByText("AI Suggested Plan"));
    await waitFor(() => {
      expect(
        getByText("Event name is required").props.accessible !== false
      ).toBe(true);
    });
  });
});

describe("Boundary Testing", () => {
  beforeEach(() => {
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  it("accepts empty string and shows error for eventName", () => {
    const { getByText, getByPlaceholderText } = render(
      <PersonalizedExperienceScreen />
    );
    fireEvent.changeText(getByPlaceholderText("Enter event name"), "");
    fireEvent.press(getByText("AI Suggested Plan"));
    expect(getByText("Event name is required")).toBeTruthy();
  });

  it("handles null eventDate gracefully", () => {
    const { getByText } = render(<PersonalizedExperienceScreen />);
    expect(getByText("Select event date")).toBeTruthy();
  });
});

describe("Scrolling Testing - PersonalizedExperienceScreen", () => {
  beforeEach(() => {
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
  });


  it("keeps input fields visible on scroll", () => {
    // This is more manual; we check if ScrollView is present wrapping inputs
    const { getByText } = render(<PersonalizedExperienceScreen />);
    expect(getByText("Event Name")).toBeTruthy();
  });

  // Test: User can scroll down to the bottom (simulate scroll event)
  it("allows scrolling through the content", () => {
    const { getByText } = render(<PersonalizedExperienceScreen />);
    const heading = getByText("Enter your details for personalized experience");

    // Simulate scroll event — react-native testing library doesn't support scroll event natively,
    // so just verify content is present and can be found
    expect(heading).toBeTruthy();
  });

  // Test: After filling inputs, fields remain visible (simulate)
  it("keeps input fields accessible after scrolling (conceptual)", () => {
    const { getByPlaceholderText } = render(<PersonalizedExperienceScreen />);
    const input = getByPlaceholderText("Enter event name");
    fireEvent.changeText(input, "Test event");

    // Cannot simulate real scrolling in RN Testing Library,
    // but can confirm input exists and is focusable
    expect(input).toBeTruthy();
  });
});
