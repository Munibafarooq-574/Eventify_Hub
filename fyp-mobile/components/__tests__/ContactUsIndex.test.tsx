import { getRenderedComponent } from '../../test-utils/renderedComponents';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ContactUsScreen from '../contactus/ContactUsIndex';

import { Ionicons } from '@expo/vector-icons';

// Mock router
jest.mock('expo-router', () => ({
    useRouter: () => ({ back: jest.fn() }),
}));

describe('ContactUsScreen', () => {
    it('renders without crashing', async () => {
        const { getByText } = await render(<ContactUsScreen />);
        expect(getByText('Contact Us')).toBeTruthy();
    });

    it('renders the phone numbers correctly', async () => {
        const { getByText } = await render(<ContactUsScreen />);
        expect(getByText('📞 +92 333 1283810')).toBeTruthy();
        expect(getByText('📞 +92 300 1234567')).toBeTruthy();
    });

    it('renders the office address correctly', async () => {
        const { getByText } = await render(<ContactUsScreen />);
        expect(getByText('🏢 Office #42, Software Tech Park')).toBeTruthy();
        expect(getByText('📍 Islamabad, Pakistan')).toBeTruthy();
    });

    it('renders the back button', async () => {
        const { container } = await render(<ContactUsScreen />);
        const icon = getRenderedComponent(container, Ionicons);
        expect(icon).toBeTruthy();
    });

    it('matches snapshot', async () => {
        const tree = (await render(<ContactUsScreen />)).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it('renders section headings', async () => {
        const { getByText } = await render(<ContactUsScreen />);
        expect(getByText('Phone Numbers')).toBeTruthy();
        expect(getByText('Office Address')).toBeTruthy();
    });

    it('renders phone section with correct count', async () => {
        const { getAllByText } = await render(<ContactUsScreen />);
        expect(getAllByText(/📞/).length).toBeGreaterThan(1);
    });




    it('renders correctly with all text blocks', async () => {
        const { getByText } = await render(<ContactUsScreen />);
        expect(getByText('Contact Us')).toBeTruthy();
        expect(getByText('Phone Numbers')).toBeTruthy();
        expect(getByText('Office Address')).toBeTruthy();
    });

    it('renders Ionicons back icon with correct props', async () => {
        const { container } = await render(<ContactUsScreen />);
        const icon = getRenderedComponent(container, Ionicons);
        expect(icon.props.name).toBe('arrow-back');
        expect(icon.props.size).toBe(24);
        expect(icon.props.color).toBe('#000');
    });
});
