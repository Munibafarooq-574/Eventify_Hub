import axios from "axios";

const searchVendors = async (query: string) => {
    try {
        const response = await axios.get(`https://eventify-hub.onrender.com/auth/search?q=${encodeURIComponent(query)}`);
        return response.data;
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
};

export default searchVendors;
