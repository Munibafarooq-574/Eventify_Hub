import axios, {
  AxiosRequestConfig,
} from 'axios';

import { getSecureData } from '@/store';

export default async function getPaymentStatus(
  vendorOrderId: string,
) {
  const url =
    `https://eventify-hub.onrender.com/payment/vendor-order/${vendorOrderId}`;

  const token =
    await getSecureData('token');

  const config: AxiosRequestConfig = {
    method: 'GET',
    url,
    headers: token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {},
  };

  try {
    const response =
      await axios(config);

    return response.data;
  } catch (error) {
    console.error(
      'Error fetching payment status:',
      error,
    );

    throw error;
  }
}