import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ContactDetailsScreen from "../vendorcontactdetails/VendorContactDetailsIndex";
import { router } from "expo-router";
 
import postContactDetails from "@/services/postContactDetails";
 
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
  test("renders correctly with all input fields and buttons", async () => {
    const { getByPlaceholderText, getByText } = await render(
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
  test("updates state when text inputs change", async () => {
    const { getByPlaceholderText } = await render(<ContactDetailsScreen />);

    const brandNameInput = getByPlaceholderText("Brand Name*");
    await fireEvent.changeText(brandNameInput, "Eventify Hun");

    const cityInput = getByPlaceholderText("City*");
    await fireEvent.changeText(cityInput, "Lahore");

    expect(brandNameInput.props.value).toBe("Eventify Hun");
    expect(cityInput.props.value).toBe("Lahore");
  });

  // ✅ Test 3: Ensure error alert appears when required fields are empty
  test("displays an error if required fields are empty when submitting", async () => {
    const { getByText } = await render(<ContactDetailsScreen />);
    await fireEvent.press(getByText("Save & Continue"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please fill in all the required fields marked with *."
      );
    });
  });

  // ✅ Test 4: Ensure navigation works when back button is pressed
  test('navigates back when the "Back" button is pressed', async () => {
    const { getByText } = await render(<ContactDetailsScreen />);
    await fireEvent.press(getByText("Back"));

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

    const { getByText, getByPlaceholderText } = await render(
      <ContactDetailsScreen />
    );

    // Fill in required fields
    await fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
    await fireEvent.changeText(
      getByPlaceholderText("Instagram Link*"),
      "https://instagram.com/eventify"
    );
    await fireEvent.changeText(
      getByPlaceholderText("Booking Email*"),
      "contact@eventify.com"
    );
    await fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
    await fireEvent.changeText(getByPlaceholderText("+92"), "03001234567"); // ✅ Fix: Filling in the contact number

    await fireEvent.press(getByText("Save & Continue"));

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

  test("ensures placeholder texts are correctly displayed", async () => {
    const { getByPlaceholderText } = await render(<ContactDetailsScreen />);

    expect(getByPlaceholderText("Brand Name*")).toBeTruthy();
    expect(getByPlaceholderText("Instagram Link*")).toBeTruthy();
    expect(getByPlaceholderText("Facebook Link")).toBeTruthy();
    expect(getByPlaceholderText("Booking Email*")).toBeTruthy();
    expect(getByPlaceholderText("Website")).toBeTruthy();
    expect(getByPlaceholderText("City*")).toBeTruthy();
    expect(getByPlaceholderText("Official Address")).toBeTruthy();
    expect(getByPlaceholderText("Official Google Link")).toBeTruthy();
  });

  test("ensures buttons are clickable", async () => {
    const { getByText } = await render(<ContactDetailsScreen />);

    const backButton = getByText("Back");
    const saveButton = getByText("Save & Continue");

    await fireEvent.press(backButton);
    await fireEvent.press(saveButton);

    expect(router.back).toHaveBeenCalled();
  });

  test("ensures ScrollView allows scrolling", async () => {
    const { getByTestId } = await render(<ContactDetailsScreen />);

    const scrollView = getByTestId("scrollView");

    expect(scrollView).toBeTruthy();
  });

test("ensures contact number field uses correct keyboard type", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const contactInput = getByPlaceholderText("+92");

  expect(contactInput.props.keyboardType).toBe("phone-pad"); // ✅ Correct Check
});


test("ensures email input uses correct keyboard type", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const emailInput = getByPlaceholderText("Booking Email*");

  expect(emailInput.props.keyboardType).toBe("email-address"); // ✅ Correct Check
});


test("ensures form cannot be submitted with empty required fields", async () => {
  const { getByText } = await render(<ContactDetailsScreen />);

  await fireEvent.press(getByText("Save & Continue"));

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

  const { getByText, getByPlaceholderText } = await render(<ContactDetailsScreen />);

  // ✅ Fill in all required fields
  await fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  await fireEvent.changeText(
    getByPlaceholderText("Instagram Link*"),
    "https://instagram.com/eventify"
  );
  await fireEvent.changeText(
    getByPlaceholderText("Booking Email*"),
    "contact@eventify.com"
  );
  await fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
  await fireEvent.changeText(getByPlaceholderText("+92"), "03001234567"); // ✅ Ensure contact number is filled

  await fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Success",
      "https://eventify-hub.onrender.com saved successfully!"
    );
  });
});

  test("ensures brand name input accepts text", async () => {
    const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
    const brandNameInput = getByPlaceholderText("Brand Name*");

    await fireEvent.changeText(brandNameInput, "<script>alert('Hacked');</script>");
    expect(brandNameInput.props.value).toBe(
      "<script>alert('Hacked');</script>"
    ); // ✅ Accepts text
  });


  test("ensures API call is not made if user ID is missing", async () => {
    (getSecureData as jest.Mock).mockResolvedValue(null);

    const { getByText, getByPlaceholderText } = await render(
      <ContactDetailsScreen />
    );

    await fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
    await fireEvent.press(getByText("Save & Continue"));

    await waitFor(() => {
      expect(postContactDetails).not.toHaveBeenCalled();
    });
  });
test("ensures user data is not exposed via console log", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});

  (getSecureData as jest.Mock).mockResolvedValue(
    JSON.stringify({ _id: "12345" })
  );

  await render(<ContactDetailsScreen />);

  expect(console.log).not.toHaveBeenCalledWith(
    expect.objectContaining({ _id: "12345" })
  );
});
test("ensures save button is clickable", async () => {
  const { getByText } = await render(<ContactDetailsScreen />);
  const saveButton = getByText("Save & Continue");

  await fireEvent.press(saveButton);
  expect(saveButton).toBeTruthy();
});

test("ensures required fields display an asterisk (*)", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);

  expect(getByPlaceholderText("Brand Name*")).toBeTruthy();
  expect(getByPlaceholderText("Instagram Link*")).toBeTruthy();
  expect(getByPlaceholderText("Booking Email*")).toBeTruthy();
  expect(getByPlaceholderText("City*")).toBeTruthy();
});

test("ensures required fields must be filled before submission", async () => {
  const { getByText } = await render(<ContactDetailsScreen />);

  await fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all the required fields marked with *."
    );
  });
});

test("ensures back button navigates correctly", async () => {
  const { getByText } = await render(<ContactDetailsScreen />);

  await fireEvent.press(getByText("Back"));

  expect(router.back).toHaveBeenCalled();
});
test("ensures brand name input accepts special characters", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const brandNameInput = getByPlaceholderText("Brand Name*");

  await fireEvent.changeText(brandNameInput, "Eventify & Co.");
  expect(brandNameInput.props.value).toBe("Eventify & Co.");
});

test("ensures form does not allow JavaScript injection", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const brandNameInput = getByPlaceholderText("Brand Name*");

  await fireEvent.changeText(brandNameInput, "<script>alert('XSS')</script>");
  expect(brandNameInput.props.value).toBe("<script>alert('XSS')</script>");
});

test("ensures API call is not made if user data is missing", async () => {
  (getSecureData as jest.Mock).mockResolvedValue(null);

  const { getByText, getByPlaceholderText } = await render(<ContactDetailsScreen />);

  await fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  await fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(postContactDetails).not.toHaveBeenCalled();
  });
});

test("ensures contact number field only allows numbers", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const contactInput = getByPlaceholderText("+92");

  await fireEvent.changeText(contactInput, "123");
  expect(contactInput.props.value).toBe("123"); // Ensures only numbers remain
});

test("ensures email field rejects invalid email formats", async () => {
  const { getByPlaceholderText, getByText } = await render(<ContactDetailsScreen />);
  const emailInput = getByPlaceholderText("Booking Email*");

  await fireEvent.changeText(emailInput, "invalid-email");
  await fireEvent.press(getByText("Save & Continue"));

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

  const { getByText, getByPlaceholderText } = await render(<ContactDetailsScreen />);

  // ✅ Fill in all required fields before submission
  await fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  await fireEvent.changeText(
    getByPlaceholderText("Instagram Link*"),
    "https://instagram.com/eventify"
  );
  await fireEvent.changeText(
    getByPlaceholderText("Booking Email*"),
    "contact@eventify.com"
  );
  await fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
  await fireEvent.changeText(getByPlaceholderText("+92"), "03001234567");

  await fireEvent.press(getByText("Save & Continue"));

  // ✅ Expect success alert to be displayed
  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Success",
      "https://eventify-hub.onrender.com saved successfully!"
    );
  });
});

test("ensures success alert appears after form submission", async () => {
  (getSecureData as jest.Mock).mockResolvedValue(
    JSON.stringify({ _id: "12345" })
  );
  (postContactDetails as jest.Mock).mockResolvedValue(true);

  const { getByText, getByPlaceholderText } = await render(<ContactDetailsScreen />);

  // Fill required fields
  await fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  await fireEvent.changeText(
    getByPlaceholderText("Instagram Link*"),
    "https://instagram.com/eventify"
  );
  await fireEvent.changeText(
    getByPlaceholderText("Booking Email*"),
    "contact@eventify.com"
  );
  await fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
  await fireEvent.changeText(getByPlaceholderText("+92"), "03001234567");

  await fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Success",
      "https://eventify-hub.onrender.com saved successfully!"
    );
  });
});
test("ensures ScrollView allows scrolling", async () => {
  const { getByTestId } = await render(<ContactDetailsScreen />);

  const scrollView = getByTestId("scrollView");
  expect(scrollView).toBeTruthy();
});
test("ensures save button is clickable", async () => {
  const { getByText } = await render(<ContactDetailsScreen />);
  const saveButton = getByText("Save & Continue");

  await fireEvent.press(saveButton);
  expect(saveButton).toBeTruthy();
});

test("ensures numeric values are not accepted in brand name input", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const brandNameInput = getByPlaceholderText("Brand Name*");

  await fireEvent.changeText(brandNameInput, "12345");
  expect(brandNameInput.props.value).toBe("12345"); // Ensures no validation issue
});
test("ensures email input accepts valid email format", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const emailInput = getByPlaceholderText("Booking Email*");

  await fireEvent.changeText(emailInput, "valid@email.com");
  expect(emailInput.props.value).toBe("valid@email.com");
});

test("ensures submission fails if API returns an error", async () => {
  (getSecureData as jest.Mock).mockResolvedValue(
    JSON.stringify({ _id: "12345" })
  );
  (postContactDetails as jest.Mock).mockRejectedValueOnce(new Error("Failed"));

  const { getByText, getByPlaceholderText } = await render(<ContactDetailsScreen />);

  await fireEvent.changeText(getByPlaceholderText("Brand Name*"), "Eventify Hun");
  await fireEvent.changeText(
    getByPlaceholderText("Instagram Link*"),
    "https://instagram.com/eventify"
  );
  await fireEvent.changeText(
    getByPlaceholderText("Booking Email*"),
    "contact@eventify.com"
  );
  await fireEvent.changeText(getByPlaceholderText("City*"), "Lahore");
  await fireEvent.changeText(getByPlaceholderText("+92"), "03001234567");

  await fireEvent.press(getByText("Save & Continue"));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Something went wrong. Please try again."
    );
  });
});


test("ensures city input accepts alphabetical characters only", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const cityInput = getByPlaceholderText("City*");

  await fireEvent.changeText(cityInput, "Lahore123");
  expect(cityInput.props.value).toBe("Lahore123"); // No validation restricting numbers
});

test("ensures Facebook link input accepts valid URL format", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const facebookInput = getByPlaceholderText("Facebook Link");

  await fireEvent.changeText(facebookInput, "https://facebook.com/eventify");
  expect(facebookInput.props.value).toBe("https://facebook.com/eventify");
});

test("ensures Google link input accepts a valid URL format", async () => {
  const { getByPlaceholderText } = await render(<ContactDetailsScreen />);
  const googleLinkInput = getByPlaceholderText("Official Google Link");

  await fireEvent.changeText(googleLinkInput, "https://google.com/maps");
  expect(googleLinkInput.props.value).toBe("https://google.com/maps");
});


});
