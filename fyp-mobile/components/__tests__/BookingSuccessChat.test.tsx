import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import createConversation from '@/services/createConversation';
import { getUserData, saveSecureData } from '@/store';
import OrderSummary from '../OrderSummary/OrderSummaryIndex';

jest.mock('expo-router', () => ({
    router: { push: jest.fn() },
    useLocalSearchParams: jest.fn(),
}));
jest.mock('@/services/createConversation', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/store', () => ({ getUserData: jest.fn(), saveSecureData: jest.fn() }));
jest.mock('@/services/reportMarketplaceLoadError', () => ({ reportMarketplaceLoadError: jest.fn() }));

jest.setTimeout(15000);

const vendors = [
    { id: 'photo', name: 'Photographer', avatar: 'photo.png' },
    { id: 'cake', name: 'Cake Vendor', avatar: '' },
];

beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(useLocalSearchParams).mockReturnValue({ chatVendors: JSON.stringify(vendors) });
    jest.mocked(getUserData).mockResolvedValue({ _id: 'client' });
    jest.mocked(createConversation).mockImplementation(async (_user, vendor) => ({ chatId: `client-${vendor}` }));
});

test.each(vendors)('opens only the selected vendor chat for $name', async vendor => {
    const screen = await render(<OrderSummary />);
    expect(screen.getByText('Booking Request Sent')).toBeTruthy();
    for (const item of vendors) expect(screen.getByText(`Chat with ${item.name}`)).toBeTruthy();

    await fireEvent.press(screen.getByText(`Chat with ${vendor.name}`));
    expect(createConversation).toHaveBeenCalledTimes(1);
    expect(createConversation).toHaveBeenCalledWith('client', vendor.id);
    expect(saveSecureData).toHaveBeenCalledWith('chatId', `client-${vendor.id}`);
    expect(saveSecureData).toHaveBeenCalledWith('receiverId', vendor.id);
    expect(router.push).toHaveBeenCalledWith('/message');
});

test('leaves the success screen available when chat fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(createConversation).mockRejectedValueOnce(new Error('Unavailable'));
    const screen = await render(<OrderSummary />);
    await fireEvent.press(screen.getByText('Chat with Photographer'));
    expect(alert).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText('View My Bookings')).toBeTruthy();
    alert.mockRestore();
});

test.each([undefined, 'malformed'])('opens a success screen without usable chat parameters (%s)', async chatVendors => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ chatVendors });
    const screen = await render(<OrderSummary />);
    expect(screen.getByText('Booking Request Sent')).toBeTruthy();
    expect(screen.queryByText('Chat with your vendors')).toBeNull();
});
