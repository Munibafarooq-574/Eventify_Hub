import axios from "axios";

const searchVendors = async (query: string) => {
    try {
        const response = await axios.get(`http://13.233.214.252:3000/auth/search?q=${encodeURIComponent(query)}`);
        return response.data;
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
};

export default searchVendors;
