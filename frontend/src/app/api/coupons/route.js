import { NextResponse } from 'next/server'; // For sending JSON responses
import { protectRoute } from '@/middleware/auth.middleware'; // Import your 'protect' middleware HOF
import { connectDB } from '@/lib/db'; // Import your DB connection function
import Coupon from '@/models/coupon.model'; // Adjust path to your Coupon Mongoose model


// Connect to the database. This is crucial as this route interacts with the Coupon model.
connectDB();


async function getCouponHandler(request) {
    try {
        const user = request.user; // Get the authenticated user object from 'protect' middleware

        // Validate that a user object is available (should be, if 'protect' works correctly)
        if (!user || !user._id) {
            return NextResponse.json({ message: "Authentication required or user not found" }, { status: 401 });
        }

        // Find an active coupon associated with the authenticated user's ID
        const coupon = await Coupon.findOne({ userId: user._id, isActive: true });

        // Return the found coupon or null if no active coupon exists
        // NextResponse.json handles sending null correctly.
        return NextResponse.json(coupon || null, { status: 200 });

    } catch (error) {
        console.error("Error in getCouponHandler:", error.message);
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}

export const GET = protectRoute(getCouponHandler);