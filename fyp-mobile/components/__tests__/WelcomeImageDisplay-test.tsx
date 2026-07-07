import React from "react";
import { render } from "@testing-library/react-native";
import WelcomeImageDisplay from "../welcome/WelcomeImageDisplay";

describe("WelcomeImageDisplay Component", () => {
  it("renders the image correctly with the given URI", () => {
    const { getByLabelText } = render(
      <WelcomeImageDisplay imageUri="https://example.com/test-image.jpg" />
    );

    const image = getByLabelText("Company Logo");
    expect(image).toBeTruthy();
    expect(image.props.source.uri).toBe("https://example.com/test-image.jpg");
  });

  it("applies correct styles to the image container", () => {
    const { getByLabelText } = render(
      <WelcomeImageDisplay imageUri="https://example.com/test-image.jpg" />
    );

    const image = getByLabelText("Company Logo");
    expect(image.props.style.width).toBe("100%");
  });

  it("has the correct accessibility label for the image", () => {
    const { getByLabelText } = render(
      <WelcomeImageDisplay imageUri="https://example.com/test-image.jpg" />
    );

    const image = getByLabelText("Company Logo");
    expect(image).toBeTruthy();
  });

it("renders a default image when no URI is provided", () => {
  const { getByLabelText } = render(<WelcomeImageDisplay imageUri="" />);

  const image = getByLabelText("Company Logo");
  expect(image.props.source.uri).toBe(""); // Adjust if using a fallback image
});

it("has the correct resizeMode property", () => {
  const { getByLabelText } = render(
    <WelcomeImageDisplay imageUri="https://example.com/test-image.jpg" />
  );

  const image = getByLabelText("Company Logo");
  expect(image.props.resizeMode).toBe("contain");
});


});