
//fyp-mobile/services/postPlaceOrder.ts
/*import axios, { AxiosRequestConfig } from "axios";

interface ServiceItem {
    vendorId: string;
    serviceName: string;
    price: number;
}

interface PlaceOrderPayload {
    organizerId: string;
    eventDate: string; // in ISO format
    eventTime: string;
    services: ServiceItem[];
    eventName: string;
    eventType?: string;
    guests: number;
    durationMinutes?: number; // NEW
}

export default async function postPlaceOrder(orderData: PlaceOrderPayload) {
    const url = `https://eventify-hub.onrender.com/orders`;
    // const url = `http://192.168.100.15:3000/orders`;
    const config: AxiosRequestConfig = {
        method: "POST",
        url,
        data: orderData,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error placing order:", error);
        throw error;
    }
}*/

// fyp-mobile/services/postPlaceOrder.ts

import axios, { AxiosRequestConfig } from "axios";
import { getSecureData } from "../store";

/**
 * Single vendor/service item
 */
export interface ServiceItem {
  vendorId: string;
  serviceName: string;
  price: number;
}

/**
 * Place order payload
 */
export interface PlaceOrderPayload {
  organizerId: string;
  eventDate: string;
  eventTime: string;
  services: ServiceItem[];
  eventName: string;
  eventType?: string;
  guests: number;
  durationMinutes?: number;
}

/**
 * Place Order API
 */
export default async function postPlaceOrder(
  orderData: PlaceOrderPayload
) {
  // Render production backend
  const url = "https://eventify-hub.onrender.com/orders";

  // -------------------------------------------------------
  // Validate payload before sending
  // -------------------------------------------------------

  if (!orderData.organizerId) {
    throw new Error("Organizer ID is required.");
  }

  if (!orderData.eventDate) {
    throw new Error("Event date is required.");
  }

  if (!orderData.eventTime) {
    throw new Error("Event time is required.");
  }

  if (!orderData.eventName) {
    throw new Error("Event name is required.");
  }

  if (
    orderData.guests === undefined ||
    orderData.guests === null ||
    Number(orderData.guests) <= 0
  ) {
    throw new Error("Number of guests must be greater than 0.");
  }

  if (!Array.isArray(orderData.services) || orderData.services.length === 0) {
    throw new Error("At least one service is required.");
  }

  // -------------------------------------------------------
  // Validate every service
  // -------------------------------------------------------

  orderData.services.forEach((service, index) => {
    if (!service.vendorId) {
      throw new Error(`Vendor ID is missing for service ${index + 1}.`);
    }

    if (!service.serviceName) {
      throw new Error(`Service name is missing for service ${index + 1}.`);
    }

    if (
      service.price === undefined ||
      service.price === null ||
      Number.isNaN(Number(service.price))
    ) {
      throw new Error(`Invalid price for service ${index + 1}.`);
    }
  });

  // -------------------------------------------------------
  // Get authentication token
  // -------------------------------------------------------

  let token: string | null = null;

  try {
    const storedToken = await getSecureData("token");

    if (storedToken) {
      token = storedToken;
    }
  } catch (tokenError) {
    console.warn(
      "Unable to read authentication token:",
      tokenError
    );
  }

  // -------------------------------------------------------
  // Prepare request config
  // -------------------------------------------------------

  const config: AxiosRequestConfig = {
    method: "POST",
    url,

    headers: {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },

    data: {
      organizerId: orderData.organizerId,

      eventDate: orderData.eventDate,

      eventTime: orderData.eventTime,

      eventName: orderData.eventName,

      ...(orderData.eventType
        ? {
            eventType: orderData.eventType,
          }
        : {}),

      guests: Number(orderData.guests),

      ...(orderData.durationMinutes !== undefined
        ? {
            durationMinutes: Number(orderData.durationMinutes),
          }
        : {}),

      services: orderData.services.map((service) => ({
        vendorId: service.vendorId,

        serviceName: service.serviceName,

        price: Number(service.price),
      })),
    },
  };

  // -------------------------------------------------------
  // Debug log
  // -------------------------------------------------------

  console.log(
    "[Place Order API] Request:",
    JSON.stringify(
      {
        method: config.method,
        url: config.url,
        hasToken: !!token,
        data: config.data,
      },
      null,
      2
    )
  );

  // -------------------------------------------------------
  // API request
  // -------------------------------------------------------

  try {
    const response = await axios(config);

    console.log(
      "[Place Order API] Response:",
      response.status,
      response.data
    );

    return response.data;
  } catch (error: any) {
    // -----------------------------------------------------
    // Axios error
    // -----------------------------------------------------

    if (axios.isAxiosError(error)) {
      console.error(
        "[Place Order API] Error:",
        {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          url: error.config?.url,
        }
      );

      // Backend error message
      const backendMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data;

      if (backendMessage) {
        throw new Error(
          Array.isArray(backendMessage)
            ? backendMessage.join(", ")
            : String(backendMessage)
        );
      }

      throw new Error(
        `Failed to place order. Server returned ${
          error.response?.status || "an unknown error"
        }.`
      );
    }

    // -----------------------------------------------------
    // Unknown error
    // -----------------------------------------------------

    console.error(
      "[Place Order API] Unexpected error:",
      error
    );

    throw new Error("Something went wrong while placing the order.");
  }
}
