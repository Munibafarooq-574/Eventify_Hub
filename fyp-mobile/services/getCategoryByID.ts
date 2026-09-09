// fyp-mobile/services/getCategoryByID.ts

import getAllCategories from "@/services/getAllCategories";

const getCategoryById = async (categoryId: string) => {
    try {
        if (!categoryId) {
            return null;
        }

        const categories = await getAllCategories();

        if (!Array.isArray(categories)) {
            return null;
        }

        const category = categories.find(
            (item: any) => item?._id === categoryId
        );

        return category || null;
    } catch (error) {
        console.error(
            "Error fetching category details:",
            error
        );

        return null;
    }
};

export default getCategoryById;