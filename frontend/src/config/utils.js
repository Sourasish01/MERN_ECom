import jwt from "jsonwebtoken";
import { redis } from "../lib/redis"; // Adjust path to your Redis client setup
import { cookies } from 'next/headers'; // Import cookies from next/headers

// No dotenv import or config() call needed here!

export const generateToken = async (userId) => { // Removed 'res' parameter
// we dont need to pass 'res' in this function as we are using Next.js App Router's cookies() API

    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m",
    });

    const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
    });

    // Store refresh token in Redis
    // Ensure 'redis' client is properly initialized and imported
    try {
        await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60); // 7 days
    } catch (error) {
        console.error("Failed to set refresh token in Redis:", error);
        // Decide how to handle this error:
        // - Throw it to be caught by the API route handler
        // - Log and continue, but acknowledge potential session issues
    }

    // --- CRUCIAL CHANGE HERE ---
    // Await the cookies() function once to get the cookieStore
    const cookieStore = await cookies(); // <--- AWAIT THIS CALL


    // Set cookies using Next.js App Router's cookies() API

    cookieStore.set("accessToken123", accessToken, { // send the jwt token as a cookie to the client as "accessToken123" named cookie
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // secure when in production
        sameSite: "strict", // prevents CSRF attack
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: "/",
    });

   // By setting the path to "/", you ensure that the cookie is accessible by all pages and API routes of your application on that domain
   // This is usually what you want for authentication tokens like accessToken and refreshToken

    cookieStore.set("refreshToken123", refreshToken, { // send the jwt token as a cookie to the client as "refreshToken123" named cookie
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // secure when in production
        sameSite: "strict", // prevents CSRF attack
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
    });

    return { accessToken, refreshToken };
};



/*
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
import dotenv from "dotenv";

dotenv.config();

export const generateToken = async (userId, res) => {

    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { // create a jwt token with the user id and the secret key
		expiresIn: "15m",
	});

	const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { // create a jwt token with the user id and the secret key
		expiresIn: "7d",
	});

	await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60); // 7 days


    res.cookie("accesstoken123", accessToken, { // send the jwt token as a cookie to the client as "accesstoken123" cookie
		httpOnly: true, // prevent XSS attacks, cross site scripting attack
		secure: process.env.NODE_ENV !== "development", // secure when in production, this will only work in https
		sameSite: "strict", // prevents CSRF attack, cross-site request forgery attack
		maxAge: 15 * 60 * 1000, // 15 minutes
	});
	res.cookie("refreshtoken123", refreshToken, { // send the jwt token as a cookie to the client as "refreshtoken123" cookie
		httpOnly: true, // prevent XSS attacks, cross site scripting attack
		secure: process.env.NODE_ENV !== "development", // secure when in production, this will only work in https
		sameSite: "strict", // prevents CSRF attack, cross-site request forgery attack
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});

return { accessToken, refreshToken }; // return the tokens to the client which can be used for further requests
};
*/