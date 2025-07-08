import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redis } from '@/lib/redis';

export async function POST(request) {
     try {

         // --- CRUCIAL CHANGE HERE ---
        // Await the cookies() function once to get the cookieStore
        const cookieStore = await cookies(); // <--- AWAIT THIS CALL
        
        const refreshToken = cookieStore.get("refreshToken123")?.value; // Get refresh token from cookie

        if (refreshToken) {
            try {
                const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET); // If a refresh token exists, it is verified using the secret key (REFRESH_TOKEN_SECRET)
                // If the token is valid, jwt.verify returns the decoded payload, which typically contains user information such as userId.
                // Invalidate refresh token in Redis
                await redis.del(`refresh_token:${decoded.userId}`); //The refresh token associated with the user's userId is deleted from Redis.
                //This effectively logs the user out by invalidating the refresh token. This ensures that the refresh token cannot be used again to generate a new access token.
                console.log(`Refresh token for user ${decoded.userId} deleted from Redis.`);
            } catch (error) {
                // If refresh token is expired or invalid, log it but still proceed to clear cookies
                console.warn("Invalid or expired refresh token during logout:", error.message);
                // We still want to clear cookies even if the refresh token is bad on the server side,
                // to ensure the client is logged out.
            }
        }

        // Clear cookies from the client
        // The .delete() method clears the cookie from the browser
        cookieStore.delete("accessToken123");
        cookieStore.delete("refreshToken123");
        return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });

    } catch (error) {
        console.error("Error in logout API route:", error.message);
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}



/*
    try {
        const cookieStore = cookies();
        const refreshToken = cookieStore.get("refreshtoken123")?.value;

        if (refreshToken) {
            try {
                const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
                await redis.del(`refresh_token:${decoded.userId}`);
                console.log(`Refresh token for user ${decoded.userId} deleted from Redis.`);
            } catch (error) {
                console.warn("Invalid or expired refresh token during logout:", error.message);
            }
        }

        cookieStore.delete("accesstoken123");
        cookieStore.delete("refreshtoken123");

        return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });

    } catch (error) {
        console.error("Error in logout API route:", error.message);
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
},
*/    