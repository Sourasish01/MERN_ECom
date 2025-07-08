import { NextResponse } from 'next/server';
import { protectRoute } from '@/middleware/auth.middleware'; // Import your protect HOF
import { connectDB } from '@/lib/db'; // Import your DB connection function

// CRUCIAL: Call connectDB here because `protect` will query the database
// to find the user based on the decoded token.
connectDB();

async function getProfileHandler(request) { // the handler function has to be async
    try {
        // Here, 'request.user' is available because the 'protect' HOF successfully
        // verified the token and attached the user object to the request before calling this handler.
        if (!request.user) {
            // This case should ideally not be reached if 'protect' functions correctly
            // and `protect` returns a proper error if user is not found.
            // But it's good for type safety or unexpected scenarios.
            return NextResponse.json({ message: "User data not found after authentication" }, { status: 404 });
        }
        // Send the user data as a JSON response
        return NextResponse.json(request.user, { status: 200 });

    } catch (error) {
        console.error("Error in getProfileHandler:", error.message);
        // This catch block handles errors *within* the getProfileHandler itself,
        // after the authentication check has passed.
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}
// Export the GET function.
// We assign the result of `protect(getProfileHandler)` to `GET`.
// When Next.js receives a GET request for this route, it will execute
// the function returned by `protect(getProfileHandler)`.
export const GET = protectRoute(getProfileHandler);

