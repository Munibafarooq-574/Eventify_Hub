// __tests__/NotificationsAccIndex.test.tsx

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NotificationsAccIndex from '../notificationacc/NotificationAccIndex'; // Adjust if path is different

// ✅ Mock useRouter from expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

// ✅ Mock getSecureData used in BottomNavigationFinal
jest.mock('@/store', () => ({
  getSecureData: jest.fn((key) => {
    if (key === 'user') {
      return Promise.resolve(
        JSON.stringify({
          _id: 'u001',
          role: 'vendor',
          name: 'Ali Test',
          email: 'ali@example.com',
          phoneNumber: '1234567890',
          address: 'Lahore',
        })
      );
    }
    return Promise.resolve(null);
  }),
}));

describe('NotificationsAccIndex', () => {
  it('shows the header title', () => {
    const { getAllByText } = render(<NotificationsAccIndex />);
    expect(getAllByText('Notifications').length).toBeGreaterThan(0);
  });

  it('renders RSVP switch with default ON', () => {
    const { getByTestId } = render(<NotificationsAccIndex />);
    expect(getByTestId('rsvp-switch').props.value).toBe(true);
  });

  it('renders Activity switch with default OFF', () => {
    const { getByTestId } = render(<NotificationsAccIndex />);
    expect(getByTestId('activity-switch').props.value).toBe(false);
  });

  it('renders Deadline switch with default ON', () => {
    const { getByTestId } = render(<NotificationsAccIndex />);
    expect(getByTestId('deadline-switch').props.value).toBe(true);
  });

  it('toggles RSVP switch from ON to OFF', () => {
    const { getByTestId } = render(<NotificationsAccIndex />);
    const toggle = getByTestId('rsvp-switch');
    fireEvent(toggle, 'valueChange', false);
    expect(toggle.props.value).toBe(false);
  });

  it('toggles Activity switch from OFF to ON', () => {
    const { getByTestId } = render(<NotificationsAccIndex />);
    const toggle = getByTestId('activity-switch');
    fireEvent(toggle, 'valueChange', true);
    expect(toggle.props.value).toBe(true);
  });

  it('toggles Deadline switch from ON to OFF', () => {
    const { getByTestId } = render(<NotificationsAccIndex />);
    const toggle = getByTestId('deadline-switch');
    fireEvent(toggle, 'valueChange', false);
    expect(toggle.props.value).toBe(false);
  });

  it('shows RSVP label text', () => {
    const { getByText } = render(<NotificationsAccIndex />);
    expect(
      getByText('Receive notification when guests RSVP to the event')
    ).toBeTruthy();
  });

  it('shows Activity label text', () => {
    const { getByText } = render(<NotificationsAccIndex />);
    expect(
      getByText('Receive notification for activity that involves me')
    ).toBeTruthy();
  });

  it('shows Activity description text', () => {
    const { getByText } = render(<NotificationsAccIndex />);
    expect(
      getByText('When a guest replies to me, mentions, or tags me')
    ).toBeTruthy();
  });

  it('shows Deadline label text', () => {
    const { getByText } = render(<NotificationsAccIndex />);
    expect(
      getByText('Receive notification about approaching deadlines for tasks')
    ).toBeTruthy();
  });

  it('renders back button and it works', () => {
    const { getByText } = render(<NotificationsAccIndex />);
    const back = getByText('< Back');
    fireEvent.press(back);
    expect(back).toBeTruthy();
  });

  it('renders all switches correctly', () => {
    const { getByTestId } = render(<NotificationsAccIndex />);
    expect(getByTestId('rsvp-switch')).toBeTruthy();
    expect(getByTestId('activity-switch')).toBeTruthy();
    expect(getByTestId('deadline-switch')).toBeTruthy();
  });

  it('renders SafeAreaView container', () => {
    const { UNSAFE_getByType } = render(<NotificationsAccIndex />);
    expect(
      UNSAFE_getByType(require('react-native').SafeAreaView)
    ).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = render(<NotificationsAccIndex />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
