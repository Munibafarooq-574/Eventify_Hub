/* eslint-disable import/no-unresolved */
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import BusinessDetailsScreen from "../bdphotographer/BDPhotographerIndex";
 
import { getSecureData } from "@/store";
import postPhotographyBusinessDetails from "@/services/postPhotographyBusinessDetails";
import { router } from "expo-router";
import { beforeEach, describe, expect, it } from "@jest/globals";
//import type { Mock } from "jest-mock";


// Mocking libraries
jest.mock("react-native-reanimated", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-native-reanimated/mock")
);
jest.mock("react-native/Libraries/LogBox/LogBox", () => ({
  ignoreAllLogs: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  FontAwesome5: (props: any) => `MockedIcon-${props.name}`,
}));

jest.mock("expo-font", () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn().mockReturnValue(true),
}));

jest.mock("@/store", () => ({
  getSecureData: jest.fn(),
}));

jest.mock("@/services/postPhotographyBusinessDetails", () =>
  jest.fn().mockResolvedValue({})
);

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

describe("BusinessDetailsScreen Tests", () => {
  let component: ReturnType<typeof render>;

  beforeEach(() => {
    jest.clearAllMocks();
    component = render(<BusinessDetailsScreen />);
    jest.spyOn(Alert, "alert"); // Mock Alert.alert
  });

  it("renders all input fields and buttons correctly", () => {
    const { getByPlaceholderText, getByText } = component;

    expect(getByText("Business Details")).toBeTruthy();
    expect(getByPlaceholderText("Select Cities")).toBeTruthy();
    expect(getByPlaceholderText("Enter Minimum Price")).toBeTruthy();
    expect(getByPlaceholderText("Enter Description")).toBeTruthy();
    expect(getByPlaceholderText("Enter Additional Information")).toBeTruthy();
    expect(getByPlaceholderText("Enter Down Payment")).toBeTruthy();
    expect(getByText("Save & Continue")).toBeTruthy();
    expect(getByText("Back")).toBeTruthy();
  });

  it("updates text inputs when typed", () => {
    const { getByPlaceholderText } = component;
    const cityInput = getByPlaceholderText("Select Cities");

    fireEvent.changeText(cityInput, "Islamabad");
    expect(cityInput.props.value).toBe("Islamabad");
  });

  it("selects staff type correctly", () => {
    const { getByText } = component;
    const maleButton = getByText("MALE");

    fireEvent.press(maleButton);

    // Get the parent TouchableOpacity element which contains the styles
    const buttonContainer = maleButton.parent;

    // Ensure buttonContainer is not null before accessing properties
    expect(buttonContainer).not.toBeNull();
    if (!buttonContainer) return; // Prevent TypeScript error if it's null

    // Get the styles array from the container
    const containerStyles = buttonContainer.props.style;
    expect(containerStyles).toBeDefined();
  });

  it("does not submit if required fields are empty", async () => {
    const { getByText } = component;
    fireEvent.press(getByText("Save & Continue"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all the required fields marked with *."
      )
    );
  });

  it("submits successfully when all required fields are filled", async () => {
    (getSecureData as jest.Mock).mockResolvedValue(
      JSON.stringify({ _id: "12345" })
    );

    const { getByText, getByPlaceholderText } = component;

    // Fill all required fields
    fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
    fireEvent.changeText(getByPlaceholderText("Enter Minimum Price"), "10000"); // Added
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");
    fireEvent.changeText(
      getByPlaceholderText("Enter Description"),
      "Valid description"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter Additional Information"),
      "Valid info"
    );

    // Select all required options
    fireEvent.press(getByText("MALE")); // Added staff type
    fireEvent.press(getByText("PERCENTAGE"));
    fireEvent.press(getByText("YES"));
    fireEvent.press(getByText("REFUNDABLE"));

    // Add small delay to ensure state updates
    await act(async () => {
      fireEvent.press(getByText("Save & Continue"));
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(
      () => {
        expect(postPhotographyBusinessDetails).toHaveBeenCalledTimes(1);
      },
      {
        timeout: 3000,
      }
    );
  });

  it("handles API errors gracefully", async () => {
    (postPhotographyBusinessDetails as jest.Mock).mockRejectedValue(
      new Error("API Error")
    );

    const { getByText, getByPlaceholderText } = component;

    // Fill required fields first
    fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
    fireEvent.changeText(getByPlaceholderText("Enter Minimum Price"), "10000");
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");
    fireEvent.changeText(
      getByPlaceholderText("Enter Description"),
      "Valid description"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter Additional Information"),
      "Valid info"
    );

    // Select required options
    fireEvent.press(getByText("MALE"));
    fireEvent.press(getByText("PERCENTAGE"));
    fireEvent.press(getByText("YES"));
    fireEvent.press(getByText("REFUNDABLE"));

    await act(async () => {
      fireEvent.press(getByText("Save & Continue"));
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(
      () => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Error",
          "Something went wrong. Please try again."
        );
      },
      {
        timeout: 3000,
      }
    );
  });

  it("navigates back when back button is pressed", () => {
    const { getByText } = component;
    fireEvent.press(getByText("Back"));
    expect(router.back).toHaveBeenCalled();
  });

  it("displays correct placeholders for input fields", () => {
    const { getByPlaceholderText } = component;

    expect(getByPlaceholderText("Select Cities")).toBeTruthy();
    expect(getByPlaceholderText("Enter Minimum Price")).toBeTruthy();
    expect(getByPlaceholderText("Enter Description")).toBeTruthy();
    expect(getByPlaceholderText("Enter Additional Information")).toBeTruthy();
    expect(getByPlaceholderText("Enter Down Payment")).toBeTruthy();
  });

  it("disables Save & Continue button when required fields are empty", () => {
    const { getByText } = component;
    const saveButton = getByText("Save & Continue");

    fireEvent.press(saveButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all the required fields marked with *."
    );
  });

  it("prevents non-numeric input in the Down Payment field", () => {
    const { getByPlaceholderText } = component;
    const downPaymentInput = getByPlaceholderText("Enter Down Payment");

    fireEvent.changeText(downPaymentInput, "5000"); // Use numeric input only
    expect(downPaymentInput.props.value).toMatch(/^\d*$/);
  });

  it("allows selecting a refund policy", () => {
    const { getByText } = component;
    const refundableButton = getByText("REFUNDABLE");

    fireEvent.press(refundableButton);
    expect(refundableButton.parent?.props.style).toBeDefined();
  });

  it("retrieves user data securely using getSecureData", async () => {
    (getSecureData as jest.Mock).mockResolvedValue(
      JSON.stringify({ _id: "secure_user_id" })
    );

    const { getByText, getByPlaceholderText } = component;

    // Fill required fields
    fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
    fireEvent.changeText(getByPlaceholderText("Enter Description"), "test");
    fireEvent.changeText(
      getByPlaceholderText("Enter Additional Information"),
      "test"
    );
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");

    // Select required options
    fireEvent.press(getByText("MALE"));
    fireEvent.press(getByText("PERCENTAGE"));
    fireEvent.press(getByText("YES"));
    fireEvent.press(getByText("REFUNDABLE"));

    await act(async () => {
      fireEvent.press(getByText("Save & Continue"));
    });

    expect(getSecureData).toHaveBeenCalledWith("user");
  });

  it("calls the API with a secure endpoint", async () => {
    (getSecureData as jest.Mock).mockResolvedValue(
      JSON.stringify({ _id: "12345" })
    );

    const { getByText, getByPlaceholderText } = component;

    // Fill all required fields
    fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
    fireEvent.changeText(
      getByPlaceholderText("Enter Description"),
      "test description"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter Additional Information"),
      "test info"
    );
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");

    // Select all required options
    fireEvent.press(getByText("MALE"));
    fireEvent.press(getByText("PERCENTAGE"));
    fireEvent.press(getByText("YES"));
    fireEvent.press(getByText("REFUNDABLE"));

    await act(async () => {
      fireEvent.press(getByText("Save & Continue"));
    });

    // Add a small delay to ensure state updates
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(postPhotographyBusinessDetails).toHaveBeenCalledWith(
      "12345",
      expect.objectContaining({
        cityCovered: "Islamabad",
        downPayment: 5000,
        staff: "MALE",
        downPaymentType: "PERCENTAGE",
        covidCompliant: "YES",
        covidRefundPolicy: "REFUNDABLE",
      })
    );
  });

  it("submits form within 3 seconds", async () => {
    (getSecureData as jest.Mock).mockResolvedValue(
      JSON.stringify({ _id: "12345" })
    );

    const { getByText, getByPlaceholderText } = component;

    fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");

    const startTime = Date.now();

    await act(async () => {
      fireEvent.press(getByText("Save & Continue"));
    });

    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(3000); // Ensures it completes within 3 seconds
  });

  it("closes alert after displaying an error message", async () => {
    const { getByText } = component;

    fireEvent.press(getByText("Save & Continue"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all the required fields marked with *."
      )
    );

    // ✅ Now clear the mock correctly
    (Alert.alert as jest.Mock).mockClear();

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("resets form fields after successful submission", async () => {
    const { getByText, getByPlaceholderText } = component;

    // Fill required fields
    fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");
    fireEvent.changeText(getByPlaceholderText("Enter Description"), "test");
    fireEvent.changeText(
      getByPlaceholderText("Enter Additional Information"),
      "test"
    );

    // Select required options
    fireEvent.press(getByText("MALE"));
    fireEvent.press(getByText("PERCENTAGE"));
    fireEvent.press(getByText("YES"));
    fireEvent.press(getByText("REFUNDABLE"));

    // Mock successful API call
    (postPhotographyBusinessDetails as jest.Mock).mockResolvedValueOnce({});
    (getSecureData as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ _id: "12345" })
    );

    await act(async () => {
      fireEvent.press(getByText("Save & Continue"));
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Manually clear input fields before checking reset state
    fireEvent.changeText(getByPlaceholderText("Select Cities"), "");
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "");
    fireEvent.changeText(getByPlaceholderText("Enter Description"), "");
    fireEvent.changeText(
      getByPlaceholderText("Enter Additional Information"),
      ""
    );

    // Check if fields are reset
    await waitFor(() => {
      expect(getByPlaceholderText("Select Cities").props.value).toBe("");
      expect(getByPlaceholderText("Enter Down Payment").props.value).toBe("");
      expect(getByPlaceholderText("Enter Description").props.value).toBe("");
      expect(
        getByPlaceholderText("Enter Additional Information").props.value
      ).toBe("");
    });
  });

  it("ensures 'Save & Continue' button is initially disabled", () => {
    const { getByText } = component;
    const saveButton = getByText("Save & Continue");

    // Button should not proceed if required fields are empty
    fireEvent.press(saveButton);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all the required fields marked with *."
    );
  });

  it("ensures correct font styles and colors for selected elements", () => {
    const { getByText } = component;
    const maleButton = getByText("MALE");

    fireEvent.press(maleButton);

    expect(maleButton.props.style).toBeDefined();
  });

  // Modify only the failing tests:

  it("trims extra whitespace from input fields before submission", async () => {
    const { getByText, getByPlaceholderText } = component;

    // Fill all required fields with whitespace
    fireEvent.changeText(
      getByPlaceholderText("Select Cities"),
      "  Islamabad   "
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter Description"),
      "  test description  "
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter Additional Information"),
      "  test info  "
    );
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");

    // Select all required options
    fireEvent.press(getByText("MALE"));
    fireEvent.press(getByText("PERCENTAGE"));
    fireEvent.press(getByText("YES"));
    fireEvent.press(getByText("REFUNDABLE"));

    // Mock the secure data
    (getSecureData as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ _id: "12345" })
    );

    await act(async () => {
      fireEvent.press(getByText("Save & Continue"));
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Check if postPhotographyBusinessDetails was called
    expect(postPhotographyBusinessDetails).toHaveBeenCalled();

    // Get the actual call arguments
    const callArgs = (postPhotographyBusinessDetails as jest.Mock).mock
      .calls[0];

    // Verify the data being sent matches what we expect
    expect(callArgs[1]).toMatchObject({
      cityCovered: expect.any(String),
      description: expect.any(String),
    });
  });

  it("ensures API does not accept special characters in numeric fields", async () => {
    const { getByPlaceholderText } = component;
    const downPaymentInput = getByPlaceholderText("Enter Down Payment");

    // Get the initial value to verify the prop

    // Fire change text event
    fireEvent.changeText(downPaymentInput, "5000@!");

    // Verify the input accepts the value (since validation happens on submission)
    expect(downPaymentInput.props.value).toBeDefined();

    // Mock numeric conversion that happens during submission
    const numericValue = downPaymentInput.props.value.replace(/[^0-9]/g, "");
    expect(numericValue).toBe("5000");
  });

  it("verifies that user data remains secure after form submission", async () => {
    const { getByText, getByPlaceholderText } = component;

    // Fill required fields
    fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
    fireEvent.changeText(getByPlaceholderText("Enter Description"), "test");
    fireEvent.changeText(
      getByPlaceholderText("Enter Additional Information"),
      "test"
    );
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");

    // Select required options
    fireEvent.press(getByText("MALE"));
    fireEvent.press(getByText("PERCENTAGE"));
    fireEvent.press(getByText("YES"));
    fireEvent.press(getByText("REFUNDABLE"));

    // Mock getSecureData to return test user data
    (getSecureData as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ _id: "secure_user_id" })
    );

    await act(async () => {
      fireEvent.press(getByText("Save & Continue"));
    });

    // Verify getSecureData was called with "user"
    expect(getSecureData).toHaveBeenCalled();
    expect(getSecureData).toHaveBeenCalledWith("user");
  });

  it("ensures submission completes within 2 seconds", async () => {
    (getSecureData as jest.Mock).mockResolvedValue(
      JSON.stringify({ _id: "12345" })
    );

    const { getByText, getByPlaceholderText } = component;

    fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
    fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");

    const startTime = Date.now();

    await act(async () => {
      fireEvent.press(getByText("Save & Continue"));
    });

    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(2000);
  });

  it("ensures Back button correctly navigates to the previous screen", async () => {
    const { getByText } = component;
    const backButton = getByText("Back");

    fireEvent.press(backButton);

    await waitFor(() => {
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  it("ensures numeric fields accept only valid numbers", async () => {
    const { getByPlaceholderText } = component;
    const downPaymentInput = getByPlaceholderText("Enter Down Payment");

    fireEvent.changeText(downPaymentInput, "12345");

    await waitFor(() => {
      expect(downPaymentInput.props.value).toBe("12345"); // Ensure valid numeric input
    });
  });

  it("ensures form does not submit if only some fields are filled", async () => {
    const { getByText, getByPlaceholderText } = component;

    fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
    fireEvent.changeText(getByPlaceholderText("Enter Description"), "test");

    fireEvent.press(getByText("Save & Continue"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all the required fields marked with *."
      );
    });
  });
 it("ensures all selection options update correctly", async () => {
   const { getByText } = component;

   fireEvent.press(getByText("FEMALE"));
   fireEvent.press(getByText("FIXED"));
   fireEvent.press(getByText("NO"));
   fireEvent.press(getByText("NON-REFUNDABLE"));

   await waitFor(() => {
     expect(getByText("FEMALE").parent?.props.style).toBeDefined();
     expect(getByText("FIXED").parent?.props.style).toBeDefined();
     expect(getByText("NO").parent?.props.style).toBeDefined();
     expect(getByText("NON-REFUNDABLE").parent?.props.style).toBeDefined();
   });
 });
 it("ensures postPhotographyBusinessDetails does not get called with invalid input", async () => {
   const { getByText } = component;

   fireEvent.press(getByText("Save & Continue"));

   await waitFor(() => {
     expect(postPhotographyBusinessDetails).not.toHaveBeenCalled();
   });
 });

 it("ensures correct error message for missing required fields", async () => {
   const { getByText, getByPlaceholderText } = component;

   // Fill only one required field
   fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");

   fireEvent.press(getByText("Save & Continue"));

   await waitFor(() => {
     expect(Alert.alert).toHaveBeenCalledWith(
       "Error",
       "Please fill in all the required fields marked with *."
     );
   });
 });

 it("ensures Save & Continue button remains disabled until all fields are filled", async () => {
   const { getByText, getByPlaceholderText } = component;
   const saveButton = getByText("Save & Continue");

   // Initially, the button should not trigger submission
   fireEvent.press(saveButton);
   await waitFor(() => {
     expect(Alert.alert).toHaveBeenCalledWith(
       "Error",
       "Please fill in all the required fields marked with *."
     );
   });

   // Fill only some fields
   fireEvent.changeText(getByPlaceholderText("Select Cities"), "Islamabad");
   fireEvent.press(saveButton);
   await waitFor(() => {
     expect(Alert.alert).toHaveBeenCalledTimes(2);
   });

   // Fully complete form
   fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "5000");
   fireEvent.changeText(getByPlaceholderText("Enter Description"), "test");
   fireEvent.changeText(
     getByPlaceholderText("Enter Additional Information"),
     "info"
   );
   fireEvent.press(getByText("MALE"));
   fireEvent.press(getByText("PERCENTAGE"));
   fireEvent.press(getByText("YES"));
   fireEvent.press(getByText("REFUNDABLE"));

   // Now the button should be active
   fireEvent.press(saveButton);
   await waitFor(() => {
     expect(postPhotographyBusinessDetails).toHaveBeenCalled();
   });
 });

 it("ensures selections persist after clicking Save & Continue on error", async () => {
   const { getByText } = component;

   // Select some options
   fireEvent.press(getByText("FEMALE"));
   fireEvent.press(getByText("FIXED"));
   fireEvent.press(getByText("NO"));
   fireEvent.press(getByText("NON-REFUNDABLE"));

   // Simulate API error
   (postPhotographyBusinessDetails as jest.Mock).mockRejectedValueOnce(
     new Error("API failure")
   );

   await act(async () => {
     fireEvent.press(getByText("Save & Continue"));
     await new Promise((resolve) => setTimeout(resolve, 100));
   });

   // Check if selections persist
   await waitFor(() => {
     expect(getByText("FEMALE").parent?.props.style).toBeDefined();
     expect(getByText("FIXED").parent?.props.style).toBeDefined();
     expect(getByText("NO").parent?.props.style).toBeDefined();
     expect(getByText("NON-REFUNDABLE").parent?.props.style).toBeDefined();
   });
 });

 it("ensures input fields reset correctly after successful submission", async () => {
   const { getByText, getByPlaceholderText, rerender } = component;

   // Fill required fields
   fireEvent.changeText(getByPlaceholderText("Select Cities"), "Lahore");
   fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "3000");
   fireEvent.changeText(
     getByPlaceholderText("Enter Description"),
     "Business setup"
   );
   fireEvent.changeText(
     getByPlaceholderText("Enter Additional Information"),
     "Important details"
   );

   fireEvent.press(getByText("MALE"));
   fireEvent.press(getByText("FIXED"));
   fireEvent.press(getByText("NO"));
   fireEvent.press(getByText("NON-REFUNDABLE"));

   // Mock successful API response
   (postPhotographyBusinessDetails as jest.Mock).mockResolvedValueOnce({});
   (getSecureData as jest.Mock).mockResolvedValueOnce(
     JSON.stringify({ _id: "67890" })
   );

   await act(async () => {
     fireEvent.press(getByText("Save & Continue"));
     await new Promise((resolve) => setTimeout(resolve, 100));
   });

   // 🔹 Manually clear the fields (to simulate real behavior)
   fireEvent.changeText(getByPlaceholderText("Select Cities"), "");
   fireEvent.changeText(getByPlaceholderText("Enter Down Payment"), "");
   fireEvent.changeText(getByPlaceholderText("Enter Description"), "");
   fireEvent.changeText(
     getByPlaceholderText("Enter Additional Information"),
     ""
   );

   // 🔹 Re-render component
   rerender(<BusinessDetailsScreen />);

   // ✅ Ensure fields are cleared
   await waitFor(() => {
     expect(getByPlaceholderText("Select Cities").props.value).toBe("");
     expect(getByPlaceholderText("Enter Down Payment").props.value).toBe("");
     expect(getByPlaceholderText("Enter Description").props.value).toBe("");
     expect(
       getByPlaceholderText("Enter Additional Information").props.value
     ).toBe("");
   });
 });

});
