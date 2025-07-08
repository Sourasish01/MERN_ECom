import { NextResponse } from 'next/server'; // For sending JSON responses
import { protectRoute } from '@/middleware/auth.middleware'; 
import { connectDB } from '@/lib/db'; 
import Coupon from '@/models/coupon.model'; 

connectDB();

async function validateCouponHandler(request) {
    try {
        const { code } = await request.json(); // Extract coupon code from request body
        const user = request.user; // Get the authenticated user object from 'protect' middleware

        // Basic validation for the coupon code
        if (!code) {
            return NextResponse.json({ message: "Coupon code is required" }, { status: 400 });
        }

        // 1. Find the coupon by code, associated with the user, and check if it's active
        const coupon = await Coupon.findOne({ code: code, userId: user._id, isActive: true });

        if (!coupon) {
            return NextResponse.json({ message: "Coupon not found or not active for this user" }, { status: 404 });
        }

        // 2. Check if the coupon has expired
        if (coupon.expirationDate && coupon.expirationDate < new Date()) {
            // If expired, update its status in the database (optional, but good for cleanup)
            coupon.isActive = false;
            await coupon.save();
            return NextResponse.json({ message: "Coupon expired" }, { status: 404 }); // 404 for "not found/usable"
        }

        // 3. If valid and not expired, return coupon details
        return NextResponse.json({
            message: "Coupon is valid",
            code: coupon.code,
            discountPercentage: coupon.discountPercentage,
        }, { status: 200 });

    } catch (error) {
        console.error("Error in validateCouponHandler:", error.message);
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}

export const POST = protectRoute(validateCouponHandler);