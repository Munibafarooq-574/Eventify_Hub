import axios, { AxiosError } from "axios";

export default async function postContactDetails(
userId: string,
contactDetails: FormData
) {
const url = `https://eventify-hub.onrender.com/vendor/contactDetails?userId=${userId}`;

try {
const response = await axios.post(url, contactDetails, {
timeout: 60000,


  // React Native/Expo mein FormData ki multipart boundary
  // Axios ko automatically set karne dein.
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

console.log("Contact details response:", response.data);

return response.data;


} catch (error) {
const axiosError = error as AxiosError<any>;


if (axiosError.response) {
  console.error(
    "Contact details server error:",
    axiosError.response.status,
    axiosError.response.data
  );
} else if (axiosError.request) {
  console.error(
    "Contact details network/timeout error:",
    axiosError.message
  );
} else {
  console.error(
    "Contact details request setup error:",
    axiosError.message
  );
}

throw error;


}
}
