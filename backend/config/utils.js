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