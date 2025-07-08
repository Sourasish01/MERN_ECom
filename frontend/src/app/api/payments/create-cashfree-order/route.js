import { NextResponse } from 'next/server'; 
import { protectRoute } from '@/middleware/auth.middleware'; 
import { connectDB } from '@/lib/db'; 
import Coupon from '@/models/coupon.model'; 
import axios from 'axios'; // Import axios for making external API calls to Cashfree


connectDB();


async function createCashfreeOrderHandler(request) {
    try {
        const { products, couponCode } = await request.json(); // Extract products and couponCode from request body
        const user = request.user; // Get the authenticated user object from 'protect' middleware

        // 1. Input Validation
        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: "Invalid or empty products array" }, { status: 400 });
        }

        // 2. Calculate Total Amount
        let totalAmount = 0;
        products.forEach((product) => {
            totalAmount += product.price * product.quantity;
        });

        // 3. Apply Coupon (if provided)
        let appliedCoupon = null;
        if (couponCode) {
            const foundCoupon = await Coupon.findOne({
                code: couponCode,
                userId: user._id,
                isActive: true,
            });
            if (foundCoupon) {
                // Ensure coupon is not expired before applying
                if (foundCoupon.expirationDate && foundCoupon.expirationDate < new Date()) {
                    // Optionally set coupon to inactive in DB here if it's found but expired
                    foundCoupon.isActive = false;
                    await foundCoupon.save();
                    console.warn(`Attempted to use expired coupon: ${couponCode}`);
                    // You might choose to return an error here instead of just warning
                } else {
                    appliedCoupon = foundCoupon;
                    const discount = totalAmount * (foundCoupon.discountPercentage / 100);
                    totalAmount -= Math.round(discount); // Round to avoid floating point issues for currency
                }
            }
        }

        
        // 4. Generate Order ID
        const orderId = `order_${Date.now()}`;
        //console.log("Order ID:", orderId);

        // 5. Call Cashfree API to create an order
        const cashfreeResponse = await axios.post(
            "https://sandbox.cashfree.com/pg/orders", // Use sandbox for testing
            {
                order_id: orderId,
                order_amount: totalAmount,
                order_currency: "INR",
                customer_details: {
                    customer_id: user._id.toString(),
                    customer_email: user.email,
                    customer_name: user.name,
                    // Ensure user.phone exists or provide a robust fallback/validation
                    customer_phone: user.phone || "9876543210", // Fallback phone number - IMPORTANT: Use a valid test number if required by Cashfree
                },
                order_meta: {
                    // Use process.env.NEXT_PUBLIC_FRONTEND_URL for client-side accessible env var
                    return_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/purchase-result?order_id=${orderId}&coupon=${couponCode || ''}`,
                },
            },
            {
                headers: {
                    "x-api-version": "2022-09-01",
                    "x-client-id": process.env.CASH_FREE_API_KEY,
                    "x-client-secret": process.env.CASH_FREE_SECRET_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Cashfree response data:", cashfreeResponse.data);

        // 6. Extract relevant data from Cashfree response
        const sessionId = cashfreeResponse.data.payment_session_id;
        const paymentLink = cashfreeResponse.data.payments.url; // Use payments.url as per typical Cashfree response for redirect

        // 7. Return success response to the client
        return NextResponse.json(
            {
                sessionId,
                totalAmount, // Return formatted amount
                paymentLink,
                couponCode, // Return the applied coupon code
                products,
                orderId // Include orderId for client-side tracking
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Cashfree order creation failed:", error?.response?.data || error.message);
        return NextResponse.json({ error: "Cashfree order creation failed" }, { status: 500 });
    }
}

export const POST = protectRoute(createCashfreeOrderHandler);