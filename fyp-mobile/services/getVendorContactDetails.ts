//fyp-mobile/services/getVednorContactDetails.ts

import axios from "axios";

export default async function getVendorContactDetails(userId: string) {
    const url = `https://eventify-hub.onrender.com/vendor/contact-details/${userId}`;

    try {
        const response = await axios.get(url);
        return response.data; // { brandName, brandLogo, contactNumber, instagramLink, facebookLink, bookingEmail, website, city, officialAddress, officialGoogleLink, ... }
    } catch (error) {
        console.error("Error fetching vendor contact details:", error);
        throw error;
    }
}