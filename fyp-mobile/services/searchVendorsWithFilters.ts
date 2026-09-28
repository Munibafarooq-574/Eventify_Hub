import axios from "axios";

const searchVendorsWithFilters = async (filters: {
  name?: string;
  categoryId?: string;
  eventCityId?: string;
  minRating?: number;
  staff?: string;
  cancellationPolicy?: string;
}) => {
  try {
    const query = new URLSearchParams();

    if (filters.name) {
      query.append("name", filters.name);
    }

    if (filters.categoryId) {
      query.append(
        "categoryId",
        filters.categoryId,
      );
    }

    if (filters.eventCityId) {
      query.append(
        "eventCityId",
        filters.eventCityId,
      );
    }

    if (filters.minRating) {
      query.append(
        "minRating",
        filters.minRating.toString(),
      );
    }

    if (filters.staff) {
      query.append(
        "staff",
        filters.staff.toUpperCase(),
      );
    }

    if (filters.cancellationPolicy) {
      query.append(
        "cancellationPolicy",
        filters.cancellationPolicy.toUpperCase(),
      );
    }

    const response = await axios.get(
      `https://eventify-hub.onrender.com/auth/vendor-search?${query.toString()}`,
    );

    return response.data;
  } catch (error) {
    console.error(
      "Vendor search failed:",
      error,
    );

    return [];
  }
};

export default searchVendorsWithFilters;