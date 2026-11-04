import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileScreen from "../vendoreditprofile/VendorEditProfileIndex";
import * as store from '@/store';
import patchUpdateProfile from '@/services/patchUpdateProfile';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: jest.fn() }),
  useGlobalSearchParams: () => ({ id: '123' }),
}));

jest.mock('@/store');
jest.mock('@/services/patchUpdateProfile');

const mockUser = {
  _id: 'u123',
  name: 'Ali',
  email: 'ali@example.com',
  phoneNumber: '3001234567',
  marketplaceCountryCode: 'US',
  buisnessCategory: 'c1',
  photographerBusinessDetails: {
    staff: 'MALE',
    refundPolicy: 'REFUNDABLE',
    description: 'Top photographer',
    cityCovered: 'Lahore, Islamabad',
  },
};

// ✅ Define global alert to avoid ReferenceError
beforeAll(() => {
  global.alert = jest.fn();
});

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (store.getUserData as jest.Mock).mockResolvedValue(mockUser);
    (patchUpdateProfile as jest.Mock).mockResolvedValue(mockUser);
  });

  it('renders Edit Profile screen', async () => {
    const { getByText } = await render(<EditProfileScreen />);
    await waitFor(() => getByText('Edit Profile'));
  });

  it('displays header title correctly', async () => {
    const { getByText } = await render(<EditProfileScreen />);
    await waitFor(() => expect(getByText('Edit Profile')).toBeTruthy());
  });

  it('renders SAVE button', async () => {
    const { getByText } = await render(<EditProfileScreen />);
    await waitFor(() => expect(getByText('SAVE')).toBeTruthy());
  });

  it('displays initial avatar letter from name', async () => {
    const { getByText } = await render(<EditProfileScreen />);
    await waitFor(() => expect(getByText('A')).toBeTruthy());
  });

  it('updates name input field', async () => {
    const { getByPlaceholderText } = await render(<EditProfileScreen />);
    const nameInput = await waitFor(() => getByPlaceholderText('Enter your name'));
    await fireEvent.changeText(nameInput, 'New Name');
    expect(nameInput.props.value).toBe('New Name');
  });

  it('updates email input field', async () => {
    const { getByPlaceholderText } = await render(<EditProfileScreen />);
    const emailInput = await waitFor(() => getByPlaceholderText('Enter your email'));
    await fireEvent.changeText(emailInput, 'new@example.com');
    expect(emailInput.props.value).toBe('new@example.com');
  });

  it('updates phone number input field', async () => {
    const { getByPlaceholderText } = await render(<EditProfileScreen />);
    const phoneInput = await waitFor(() => getByPlaceholderText('Enter phone number'));
    await fireEvent.changeText(phoneInput, '3012345678');
    expect(phoneInput.props.value).toBe('3012345678');
  });

  it('does not show a personal address field', async () => {
    const { queryByTestId, findByDisplayValue } = render(<EditProfileScreen />);
    await findByDisplayValue('Ali');
    expect(queryByTestId('input-address')).toBeNull();
  });

  it('triggers saveUserDetails on SAVE press', async () => {
    const { getByText } = await render(<EditProfileScreen />);
    const saveBtn = await waitFor(() => getByText('SAVE'));
    await fireEvent.press(saveBtn);
    await waitFor(() => expect(patchUpdateProfile).toHaveBeenCalledTimes(1));
  });

  it('fetches and displays correct user data on mount', async () => {
    const { getByDisplayValue } = await render(<EditProfileScreen />);
    await waitFor(() => {
      expect(getByDisplayValue('Ali')).toBeTruthy();
      expect(getByDisplayValue('ali@example.com')).toBeTruthy();
      expect(getByDisplayValue('3001234567')).toBeTruthy();
    });
  });

  it('shows the vendor’s saved country as read-only', async () => {
    const { findByDisplayValue } = render(<EditProfileScreen />);
    expect((await findByDisplayValue('United States')).props.editable).toBe(false);
  });

  it('back button navigates correctly', async () => {
    const { getByLabelText } = render(<EditProfileScreen />);
    const backBtn = getByLabelText('Go back');
    await fireEvent.press(backBtn);
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders avatar with correct fallback if name missing', async () => {
    (store.getUserData as jest.Mock).mockResolvedValue({ ...mockUser, name: '' });
    const { getByText } = await render(<EditProfileScreen />);
    await waitFor(() => expect(getByText('N/A')).toBeTruthy());
  });

  it('shows alert on failed saveUserDetails call', async () => {
    (patchUpdateProfile as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const { getByText } = await render(<EditProfileScreen />);
    const saveBtn = await waitFor(() => getByText('SAVE'));
    await fireEvent.press(saveBtn);
    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Failed to save profile. Please try again.'));
  });
});
