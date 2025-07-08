import jwt from "jsonwebtoken";
import User from "@/models/user.model"; 
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // For accessing cookies in App Router


export const protectRoute = (handler) => async (request) => { // handler is the original Next.js API route handler function that we want the middleware to be used with
	//before the request reaches the original handler, we want to check if the user is authenticated
    try {
        const cookieStore = await cookies(); // Await the cookies() call // cookies function is used in Next.js App Router to access cookies
		//the await is necessary because cookies() function returns a object that takes time to resolve
		// once we get that object we can use varios methods to access cookies or set cookies

        const accessToken = cookieStore.get("accessToken123")?.value;

        if (!accessToken) {
            return NextResponse.json({ message: "Unauthorized - No access token provided" }, { status: 401 });
        }

        try {
            const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET); // verify the token with the secret key , get decoded payload
            const user = await User.findById(decoded.userId).select("-password"); // find the user by id exclude the password field

            if (!user) {
                return NextResponse.json({ message: "User not found" }, { status: 404 }); // Changed to 404 as user ID from token didn't yield a user
            }
			// when the user is found, add the user object to the request object
            request.user = user; 

            // If everything is successful, call the original handler with the modified request
            return handler(request); // request object will now have the user object attached to it, which can be accessed in the next middleware or route handler function

        } catch (error) {
            console.error("Error verifying access token:", error.message); // More specific logging

            if (error.name === "TokenExpiredError") {
                return NextResponse.json({ message: "Unauthorized - Access token expired" }, { status: 401 });
            }
            // For other JWT errors (e.g., JsonWebTokenError for invalid token)
            return NextResponse.json({ message: "Unauthorized - Invalid access token" }, { status: 401 });
        }

    } catch (error) {
        console.error("Error in protect middleware wrapper:", error.message);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
};



export const adminRoute = (handler) => async (request) => {
    // We assume 'request.user' has been populated by a preceding 'protectRoute' middleware.
    if (!request.user) {
        // This case should ideally not happen if 'admin' is always chained after 'protect'.
        // If it does, it means 'protect' failed or wasn't applied.
        return NextResponse.json({ message: "Access denied - User not authenticated" }, { status: 401 });
    }

    if (request.user.role === "admin") {
        return handler(request); // If admin, proceed to the original handler function 
    } else {
        return NextResponse.json({ message: "Access denied - Admin only" }, { status: 403 });
    }
};