import { NextResponse } from 'next/server'; // For sending JSON responses
import { cookies } from 'next/headers'; // For accessing and setting cookies
import jwt from 'jsonwebtoken'; // For JWT verification and signing
import { redis } from '@/lib/redis'; // Adjust path to your Redis client setup

// Note: connectDB is generally not needed for this route unless your Redis setup
// or other parts implicitly rely on a MongoDB connection.
// If your Redis client is independent, you can omit connectDB() here.

export async function POST(request) {
    try {
        const cookieStore = await cookies(); // Await the cookies() call to get the store
        const refreshToken = cookieStore.get("refreshToken123")?.value; // Get refresh token from cookie

        // 1. Check if refresh token is provided
        if (!refreshToken) {
            return NextResponse.json({ message: "No refresh token provided" }, { status: 401 });
        }

        let decoded;
        try {
            // 2. Verify the refresh token
            decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        } catch (jwtError) {
            console.error("Error verifying refresh token:", jwtError.message);
            if (jwtError.name === "TokenExpiredError") {
                return NextResponse.json({ message: "Refresh token expired" }, { status: 401 });
            }
            return NextResponse.json({ message: "Invalid refresh token" }, { status: 401 });
        }

        // 3. Check if the refresh token exists and matches in Redis
        // Ensure Redis is connected and available.
        const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

        if (!storedToken || storedToken !== refreshToken) {
            // If no stored token or mismatch, it's an invalid/revoked token
            return NextResponse.json({ message: "Invalid or revoked refresh token" }, { status: 401 });
        }

        // 4. Generate a new access token
        const newAccessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, { //If the refresh token is valid, a new access token is generated.
            expiresIn: "15m",
        });

        // 5. Set the new access token as a cookie
        cookieStore.set("accessToken123", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // secure when in production
            sameSite: "strict", // prevents CSRF attack
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: "/", // Make it available across the whole domain
        });

        // 6. Send success response
        return NextResponse.json({ message: "Access token refreshed successfully" }, { status: 200 });

    } catch (error) {
        console.error("Error in refresh-accesstoken API route:", error.message);
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}
