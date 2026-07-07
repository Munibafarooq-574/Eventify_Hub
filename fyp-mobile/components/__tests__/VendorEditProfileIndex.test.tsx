import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileScreen from "../vendoreditprofile/VendorEditProfileIndex";
import * as store from '@/store';
import patchUpdateProfile from '@/services/patchUpdateProfile';
import getAllCategories from '@/services/getAllCategories';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useGlobalSearchParams: () => ({ id: '123' }),
}));

jest.mock('@/store');
jest.mock('@/services/patchUpdateProfile');
jest.mock('@/services/getAllCategories', () => jest.fn());

const mockUser = {
  _id: 'u123',
  name: 'Ali',
  email: 'ali@example.com',
  phoneNumber: '3001234567',
  contactDetails: { address: 'Lahore' },
  buisnessCategory: 'c1',
  photographerBusinessDetails: {
    staff: 'MALE',
    refundPolicy: 'REFUNDABLE',
    description: 'Top photographer',
    cityCovered: 'Lahore, Islamabad',
  },
};

const mockCategories = [
  { _id: 'c1', name: 'Photography' },
];

// ✅ Define global alert to avoid ReferenceError
beforeAll(() => {
  global.alert = jest.fn();
});

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (store.getSecureData as jest.Mock).mockResolvedValue(JSON.stringify(mockUser));
    (getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
    (patchUpdateProfile as jest.Mock).mockResolvedValue(mockUser);
  });

  it('renders Edit Profile screen', async () => {
    const { getByText } = render(<EditProfileScreen />);
    await waitFor(() => getByText('Edit Profile'));
  });

  it('displays header title correctly', async () => {
    const { getByText } = render(<EditProfileScreen />);
    await waitFor(() => expect(getByText('Edit Profile')).toBeTruthy());
  });

  it('renders SAVE button', async () => {
    const { getByText } = render(<EditProfileScreen />);
    await waitFor(() => expect(getByText('SAVE')).toBeTruthy());
  });

  it('displays initial avatar letter from name', async () => {
    const { getByText } = render(<EditProfileScreen />);
    await waitFor(() => expect(getByText('A')).toBeTruthy());
  });

  it('updates name input field', async () => {
    const { getByPlaceholderText } = render(<EditProfileScreen />);
    const nameInput = await waitFor(() => getByPlaceholderText('Enter your name'));
    fireEvent.changeText(nameInput, 'New Name');
    expect(nameInput.props.value).toBe('New Name');
  });

  it('updates email input field', async () => {
    const { getByPlaceholderText } = render(<EditProfileScreen />);
    const emailInput = await waitFor(() => getByPlaceholderText('Enter your email'));
    fireEvent.changeText(emailInput, 'new@example.com');
    expect(emailInput.props.value).toBe('new@example.com');
  });

  it('updates phone number input field', async () => {
    const { getByPlaceholderText } = render(<EditProfileScreen />);
    const phoneInput = await waitFor(() => getByPlaceholderText('Enter phone number'));
    fireEvent.changeText(phoneInput, '3012345678');
    expect(phoneInput.props.value).toBe('3012345678');
  });

  it('updates address input field', async () => {
    const { getByTestId } = render(<EditProfileScreen />);
    const addressInput = await waitFor(() => getByTestId('input-address'));
    fireEvent.changeText(addressInput, 'New Address');
    expect(addressInput.props.value).toBe('New Address');
  });

  it('triggers saveUserDetails on SAVE press', async () => {
    const { getByText } = render(<EditProfileScreen />);
    const saveBtn = await waitFor(() => getByText('SAVE'));
    fireEvent.press(saveBtn);
    await waitFor(() => expect(patchUpdateProfile).toHaveBeenCalledTimes(1));
  });

  it('fetches and displays correct user data on mount', async () => {
    const { getByDisplayValue } = render(<EditProfileScreen />);
    await waitFor(() => {
      expect(getByDisplayValue('Ali')).toBeTruthy();
      expect(getByDisplayValue('ali@example.com')).toBeTruthy();
      expect(getByDisplayValue('3001234567')).toBeTruthy();
      expect(getByDisplayValue('Lahore')).toBeTruthy();
    });
  });

  it('shows default country as Pakistan (non-editable)', async () => {
    const { getByPlaceholderText } = render(<EditProfileScreen />);
    await waitFor(() => expect(getByPlaceholderText('Pakistan')).toBeTruthy());
  });

  it('back button navigates correctly', async () => {
    const { getByText } = render(<EditProfileScreen />);
    const backBtn = await waitFor(() => getByText('< Back'));
    fireEvent.press(backBtn);
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders avatar with correct fallback if name missing', async () => {
    (store.getSecureData as jest.Mock).mockResolvedValue(
      JSON.stringify({ ...mockUser, name: '' })
    );
    const { getByText } = render(<EditProfileScreen />);
    await waitFor(() => expect(getByText('N/A')).toBeTruthy());
  });

  it('shows alert on failed saveUserDetails call', async () => {
    (patchUpdateProfile as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const { getByText } = render(<EditProfileScreen />);
    const saveBtn = await waitFor(() => getByText('SAVE'));
    fireEvent.press(saveBtn);
    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Failed to save profile. Please try again.'));
  });
});
