import axios from "axios";

const getCategoryById = async (categoryId: string) => {
    try {
        const response = await axios.get(`https://api.yourdomain.com/categories/${categoryId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching category details:", error);
        return null;
    }
};

export default getCategoryById;
