import axios from "axios";

const axiosInstance = axios.create({
	baseURL: process.env.NEXT_PUBLIC_BACKEND_URL + "/api", // Use the environment variable for the base URL
	withCredentials: true, // send cookies to the server
});

export default axiosInstance;