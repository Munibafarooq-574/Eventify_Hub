

// fyp-mobile/services/postPlaceOrder.ts

import axios, { AxiosRequestConfig } from "axios";
import { reportMarketplaceLoadError } from "./reportMarketplaceLoadError";
import { getSecureData } from "../store";

/**
 * Single vendor/service item
 */
export interface ServiceItem {
  vendorId: string;
  serviceName: string;
  price: number;
  packageId: string;
  durationMinutes?: number;
  quantity?: number;
  requiredServiceWindow?: {
    startDateTime: string;
    endDateTime: string;
  } | null;
  promotion?: {
    promotionId: string;
    promotionType: "COUPON" | "DISCOUNT_CODE";
    promotionCode: string;
  };
}
/**
 * Place order payload
 */
export interface PlaceOrderPayload {
  organizerId: string;
  eventId: string;
  eventDate: string;
  eventTime: string;
  services: ServiceItem[];
  eventName: string;
  eventType?: string;
  guests: number;
  durationMinutes?: number;

  eventCityId: string;
  eventAddress: string;
  selectedCategoryIds?: string[];
  replacementRescheduleRequestId?: string;
  replacementVendorOrderId?: string;
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

  if (!orderData.eventCityId) {
  throw new Error("Event city is required.");
}

if (!orderData.eventAddress?.trim()) {
  throw new Error("Event address is required.");
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
    timeout: 30000,
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
      eventId: orderData.eventId,

      eventDate: orderData.eventDate,

      eventTime: orderData.eventTime,

      eventName: orderData.eventName,

      eventCityId: orderData.eventCityId,

      eventAddress: orderData.eventAddress.trim(),

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

      selectedCategoryIds:
        orderData.selectedCategoryIds ?? [],

      ...(orderData.replacementRescheduleRequestId
        ? { replacementRescheduleRequestId: orderData.replacementRescheduleRequestId }
        : {}),

      ...(orderData.replacementVendorOrderId ? { replacementVendorOrderId: orderData.replacementVendorOrderId } : {}),

      services: orderData.services.map((service) => ({
        vendorId: service.vendorId,
        serviceName: service.serviceName,
        price: Number(service.price),
        packageId: service.packageId,
        durationMinutes: service.durationMinutes,
        quantity: service.quantity,
        requiredServiceWindow:
          service.requiredServiceWindow,
        promotion: service.promotion,
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
    reportMarketplaceLoadError('Booking submission unavailable', error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) throw new Error('Your session has expired. Please sign in again.');
      if (status === 404) throw new Error('A selected vendor or package is no longer available. Please review your cart.');
      if (!status || status >= 500) {
        throw new Error('Booking could not be submitted right now. Your cart is saved. Please try again shortly.');
      }
      const data = error.response?.data;
      const rawMessage = typeof data?.message === 'object' && !Array.isArray(data?.message)
        ? data.message?.message : data?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      if (typeof message === 'string' && message.trim() &&
          message.length <= 500 && !/[<>]|https?:|AxiosError|stack trace/i.test(message)) {
        throw new Error(message.trim());
      }
      throw new Error('Unable to submit this booking. Please review your cart and try again.');
    }
    throw new Error('Unable to submit this booking. Please try again.');
  }
}
