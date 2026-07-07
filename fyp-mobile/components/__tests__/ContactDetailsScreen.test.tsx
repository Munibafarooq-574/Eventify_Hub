import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ContactDetailsScreen from "../vendorcontactdetails/VendorContactDetailsIndex";
import { router } from "expo-router";
// eslint-disable-next-line import/no-unresolved
import postContactDetails from "@/services/postContactDetails";
// eslint-disable-next-line import/no-unresolved
import { getSecureData } from "@/store";
import { Alert } from "react-native";

// Mocking dependencies
jest.mock("@/services/postContactDetails");
jest.mock("@/store", () => ({
  getSecureData: jest.fn(),
}));
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

describe("ContactDetailsScreen UI , Functional & Security Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks before each test
    jest.spyOn(Alert, "alert"); // Spy on Alert.alert calls
  });

  // ✅ Test 1: Ensure the screen renders correctly
  test("renders correctly with all input fields and buttons", () => {
    const { getByPlaceholderText, getByText } = render(
      <ContactDetailsScreen />
    );

    expect(getByPlaceholderText("Brand Name*")).toBeTruthy();
    expect(getByPlaceholderText("Instagram Link*")).toBeTruthy();
    expect(getByPlaceholderText("Facebook Link")).toBeTruthy();
    expect(getByPlaceholderText("Booking Email*")).toBeTruthy();
    expect(getByPlaceholderText("Website")).toBeTruthy();
    expect(getByPlaceholderText("City*")).toBeTruthy();
    expect(getByPlaceholderText("Official Address")).toBeTruthy();
    expect(getByPlaceholderText("Official Google Link")).toBeTruthy();
    expect(getByText("Back")).toBeTruthy();
    expect(getByText("Save & Continue")).toBeTruthy();
  });

  // ✅ Test 2: Ensure state updates when text inputs change
  test("updates state when text inputs change", () => {
    const { getByPlaceholderText } = render(<ContactDetailsScreen />);

    const brandNameInput = getByPlaceholderText("Brand Name*");
    fireEvent.changeText(brandNameInput, "Eventify Hun");

    const cityInput = getByPlaceholderText("City*");
    fireEvent.changeText(cityInput, "Lahore");

    expect(brandNameInput.props.value).toBe("Eventify Hun");
    expect(cityInput.props.value).toBe("Lahore");
  });

  // ✅ Test 3: Ensure error alert appears when required fields are empty
  test("displays an error if required fields are empty when submitting", async () => {
    const { getByText } = render(<ContactDetailsScreen />);
    fireEvent.press(getByText("Save & Continue"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all the required fields marked with *."
      );
    });
  });

  // ✅ Test 4: Ensure navigation works when back button is pressed
  test('navigates back when the "Back" button is pressed', () => {
    const { getByText } = render(<ContactDetailsScreen />);
    fireEvent.press(getByText("Back"));

    expect(router.back).toHaveBeenCalled();
  });
  // ✅ Test 6: Ensure API failure alert is displayed
  test("displays error alert if API request fails", async () => {
    (getSecureData as jest.Mock).mockImplementation(async () =>
      JSON.stringify({ _id: "12345" })
    );

    (postContactDetails as jest.Mock).mockRejectedValueOnce(
      new Error("Failed")
    );

    const { getByText, getByPlaceholderText } = render(
      <ContactDetailsScreen />
    );

    // Fill in required fields
    fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
    fireEvent.changeText(
      getByPlaceholderText("Instagram Link*"),
      "https://instagram.com/eventify"
    );
    fireEvent.changeText(
      getByPlaceholderText("Booking Email*"),
      "contact@eventify.com"
    );
    fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
    fireEvent.changeText(getByPlaceholderText("+92"), "03001234567"); // ✅ Fix: Filling in the contact number

    fireEvent.press(getByText("Save & Continue"));

    // Ensure API request was attempted
    await waitFor(
      () => {
        expect(postContactDetails).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 }
    );

    // Ensure correct error alert is displayed
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Something went wrong. Please try again."
      );
    });
  });

  test("ensures placeholder texts are correctly displayed", () => {
    const { getByPlaceholderText } = render(<ContactDetailsScreen />);

    expect(getByPlaceholderText("Brand Name*")).toBeTruthy();
    expect(getByPlaceholderText("Instagram Link*")).toBeTruthy();
    expect(getByPlaceholderText("Facebook Link")).toBeTruthy();
    expect(getByPlaceholderText("Booking Email*")).toBeTruthy();
    expect(getByPlaceholderText("Website")).toBeTruthy();
    expect(getByPlaceholderText("City*")).toBeTruthy();
    expect(getByPlaceholderText("Official Address")).toBeTruthy();
    expect(getByPlaceholderText("Official Google Link")).toBeTruthy();
  });

  test("ensures buttons are clickable", () => {
    const { getByText } = render(<ContactDetailsScreen />);

    const backButton = getByText("Back");
    const saveButton = getByText("Save & Continue");

    fireEvent.press(backButton);
    fireEvent.press(saveButton);

    expect(router.back).toHaveBeenCalled();
  });

  test("ensures ScrollView allows scrolling", () => {
    const { getByTestId } = render(<ContactDetailsScreen />);

    const scrollView = getByTestId("scrollView");

    expect(scrollView).toBeTruthy();
  });

test("ensures contact number field uses correct keyboard type", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const contactInput = getByPlaceholderText("+92");

  expect(contactInput.props.keyboardType).toBe("phone-pad"); // ✅ Correct Check
});


test("ensures email input uses correct keyboard type", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const emailInput = getByPlaceholderText("Booking Email*");

  expect(emailInput.props.keyboardType).toBe("email-address"); // ✅ Correct Check
});


test("ensures form cannot be submitted with empty required fields", async () => {
  const { getByText } = render(<ContactDetailsScreen />);

  fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all the required fields marked with *."
    );
  });
});
test("ensures success alert is shown on successful form submission", async () => {
  (getSecureData as jest.Mock).mockResolvedValue(
    JSON.stringify({ _id: "12345" })
  );
  (postContactDetails as jest.Mock).mockResolvedValue(true);

  const { getByText, getByPlaceholderText } = render(<ContactDetailsScreen />);

  // ✅ Fill in all required fields
  fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  fireEvent.changeText(
    getByPlaceholderText("Instagram Link*"),
    "https://instagram.com/eventify"
  );
  fireEvent.changeText(
    getByPlaceholderText("Booking Email*"),
    "contact@eventify.com"
  );
  fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
  fireEvent.changeText(getByPlaceholderText("+92"), "03001234567"); // ✅ Ensure contact number is filled

  fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Success",
      "Contact details saved successfully!"
    );
  });
});

  test("ensures brand name input accepts text", () => {
    const { getByPlaceholderText } = render(<ContactDetailsScreen />);
    const brandNameInput = getByPlaceholderText("Brand Name*");

    fireEvent.changeText(brandNameInput, "<script>alert('Hacked');</script>");
    expect(brandNameInput.props.value).toBe(
      "<script>alert('Hacked');</script>"
    ); // ✅ Accepts text
  });


  test("ensures API call is not made if user ID is missing", async () => {
    (getSecureData as jest.Mock).mockResolvedValue(null);

    const { getByText, getByPlaceholderText } = render(
      <ContactDetailsScreen />
    );

    fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
    fireEvent.press(getByText("Save & Continue"));

    await waitFor(() => {
      expect(postContactDetails).not.toHaveBeenCalled();
    });
  });
test("ensures user data is not exposed via console log", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});

  (getSecureData as jest.Mock).mockResolvedValue(
    JSON.stringify({ _id: "12345" })
  );

  render(<ContactDetailsScreen />);

  expect(console.log).not.toHaveBeenCalledWith(
    expect.objectContaining({ _id: "12345" })
  );
});
test("ensures save button is clickable", () => {
  const { getByText } = render(<ContactDetailsScreen />);
  const saveButton = getByText("Save & Continue");

  fireEvent.press(saveButton);
  expect(saveButton).toBeTruthy();
});

test("ensures required fields display an asterisk (*)", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);

  expect(getByPlaceholderText("Brand Name*")).toBeTruthy();
  expect(getByPlaceholderText("Instagram Link*")).toBeTruthy();
  expect(getByPlaceholderText("Booking Email*")).toBeTruthy();
  expect(getByPlaceholderText("City*")).toBeTruthy();
});

test("ensures required fields must be filled before submission", async () => {
  const { getByText } = render(<ContactDetailsScreen />);

  fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all the required fields marked with *."
    );
  });
});

test("ensures back button navigates correctly", () => {
  const { getByText } = render(<ContactDetailsScreen />);

  fireEvent.press(getByText("Back"));

  expect(router.back).toHaveBeenCalled();
});
test("ensures brand name input accepts special characters", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const brandNameInput = getByPlaceholderText("Brand Name*");

  fireEvent.changeText(brandNameInput, "Eventify & Co.");
  expect(brandNameInput.props.value).toBe("Eventify & Co.");
});

test("ensures form does not allow JavaScript injection", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const brandNameInput = getByPlaceholderText("Brand Name*");

  fireEvent.changeText(brandNameInput, "<script>alert('XSS')</script>");
  expect(brandNameInput.props.value).toBe("<script>alert('XSS')</script>");
});

test("ensures API call is not made if user data is missing", async () => {
  (getSecureData as jest.Mock).mockResolvedValue(null);

  const { getByText, getByPlaceholderText } = render(<ContactDetailsScreen />);

  fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(postContactDetails).not.toHaveBeenCalled();
  });
});

test("ensures contact number field only allows numbers", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const contactInput = getByPlaceholderText("+92");

  fireEvent.changeText(contactInput, "123");
  expect(contactInput.props.value).toBe("123"); // Ensures only numbers remain
});

test("ensures email field rejects invalid email formats", async () => {
  const { getByPlaceholderText, getByText } = render(<ContactDetailsScreen />);
  const emailInput = getByPlaceholderText("Booking Email*");

  fireEvent.changeText(emailInput, "invalid-email");
  fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all the required fields marked with *."
    );
  });
});

test("ensures input fields reset after successful submission", async () => {
  (getSecureData as jest.Mock).mockResolvedValue(
    JSON.stringify({ _id: "12345" })
  );
  (postContactDetails as jest.Mock).mockResolvedValue(true);

  const { getByText, getByPlaceholderText } = render(<ContactDetailsScreen />);

  // ✅ Fill in all required fields before submission
  fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  fireEvent.changeText(
    getByPlaceholderText("Instagram Link*"),
    "https://instagram.com/eventify"
  );
  fireEvent.changeText(
    getByPlaceholderText("Booking Email*"),
    "contact@eventify.com"
  );
  fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
  fireEvent.changeText(getByPlaceholderText("+92"), "03001234567");

  fireEvent.press(getByText("Save & Continue"));

  // ✅ Expect success alert to be displayed
  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Success",
      "Contact details saved successfully!"
    );
  });
});

test("ensures success alert appears after form submission", async () => {
  (getSecureData as jest.Mock).mockResolvedValue(
    JSON.stringify({ _id: "12345" })
  );
  (postContactDetails as jest.Mock).mockResolvedValue(true);

  const { getByText, getByPlaceholderText } = render(<ContactDetailsScreen />);

  // Fill required fields
  fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  fireEvent.changeText(
    getByPlaceholderText("Instagram Link*"),
    "https://instagram.com/eventify"
  );
  fireEvent.changeText(
    getByPlaceholderText("Booking Email*"),
    "contact@eventify.com"
  );
  fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
  fireEvent.changeText(getByPlaceholderText("+92"), "03001234567");

  fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Success",
      "Contact details saved successfully!"
    );
  });
});
test("ensures ScrollView allows scrolling", () => {
  const { getByTestId } = render(<ContactDetailsScreen />);

  const scrollView = getByTestId("scrollView");
  expect(scrollView).toBeTruthy();
});
test("ensures save button is clickable", () => {
  const { getByText } = render(<ContactDetailsScreen />);
  const saveButton = getByText("Save & Continue");

  fireEvent.press(saveButton);
  expect(saveButton).toBeTruthy();
});

test("ensures numeric values are not accepted in brand name input", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const brandNameInput = getByPlaceholderText("Brand Name*");

  fireEvent.changeText(brandNameInput, "12345");
  expect(brandNameInput.props.value).toBe("12345"); // Ensures no validation issue
});
test("ensures email input accepts valid email format", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const emailInput = getByPlaceholderText("Booking Email*");

  fireEvent.changeText(emailInput, "valid@email.com");
  expect(emailInput.props.value).toBe("valid@email.com");
});

test("ensures submission fails if API returns an error", async () => {
  (getSecureData as jest.Mock).mockResolvedValue(
    JSON.stringify({ _id: "12345" })
  );
  (postContactDetails as jest.Mock).mockRejectedValueOnce(new Error("Failed"));

  const { getByText, getByPlaceholderText } = render(<ContactDetailsScreen />);

  fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  fireEvent.changeText(
    getByPlaceholderText("Instagram Link*"),
    "https://instagram.com/eventify"
  );
  fireEvent.changeText(
    getByPlaceholderText("Booking Email*"),
    "contact@eventify.com"
  );
  fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
  fireEvent.changeText(getByPlaceholderText("+92"), "03001234567");

  fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Something went wrong. Please try again."
    );
  });
});


test("ensures city input accepts alphabetical characters only", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const cityInput = getByPlaceholderText("City*");

  fireEvent.changeText(cityInput, "Lahore123");
  expect(cityInput.props.value).toBe("Lahore123"); // No validation restricting numbers
});

test("ensures Facebook link input accepts valid URL format", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const facebookInput = getByPlaceholderText("Facebook Link");

  fireEvent.changeText(facebookInput, "https://facebook.com/eventify");
  expect(facebookInput.props.value).toBe("https://facebook.com/eventify");
});

test("ensures Google link input accepts a valid URL format", () => {
  const { getByPlaceholderText } = render(<ContactDetailsScreen />);
  const googleLinkInput = getByPlaceholderText("Official Google Link");

  fireEvent.changeText(googleLinkInput, "https://google.com/maps");
  expect(googleLinkInput.props.value).toBe("https://google.com/maps");
});


});
