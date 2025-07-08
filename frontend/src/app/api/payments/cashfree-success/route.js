import { NextResponse } from 'next/server'; 
import { protectRoute } from '@/middleware/auth.middleware'; 
import { connectDB } from '@/lib/db'; 
import Coupon from '@/models/coupon.model'; 
import Order from '@/models/order.model';   
import User from '@/models/user.model';     
import axios from 'axios'; // Import axios for making external API calls to Cashfree


connectDB();


// This function is used to create a new coupon for the user after a qualifying purchase.
const createNewCoupon = async (userId) => {
    try {

        await Coupon.findOneAndDelete({ userId });

        const newCoupon = new Coupon({
            code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(), // Generate a random code
            discountPercentage: 10, // Example: 10% discount
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
            userId: userId, // Link to the user
            //isActive: true, // Mark as active
        });
        await newCoupon.save();
        console.log(`New coupon created for user ${userId}: ${newCoupon.code}`);
        return newCoupon;
    } catch (error) {
        console.error(`Error creating new coupon for user ${userId}:`, error.message);
        // Do not rethrow; failure to create a coupon shouldn't fail the order success.
        return null;
    }
};



async function cashfreeSuccessHandler(request) {
    try {
        // Extract data from the request body sent from your frontend
        const { orderId, products, couponCode } = await request.json();
        console.log("Cashfree success request body - products:", products);
        console.log("Cashfree success request body - orderId:", orderId);
        console.log("Cashfree success request body - couponCode:", couponCode);

        const user = request.user; // Authenticated user object from 'protectRoute' middleware

        // 1. Verify payment status with Cashfree API (Server-to-Server Verification)
        const verifyResponse = await axios.get(
			`https://sandbox.cashfree.com/pg/orders/${orderId}`,
			{
				headers: {
					"x-api-version": "2022-09-01",
					"x-client-id": process.env.CASH_FREE_API_KEY,
					"x-client-secret": process.env.CASH_FREE_SECRET_KEY,
				},
			}
		);

        const cashfreeData = verifyResponse.data;
        console.log("Cashfree verify response:", cashfreeData);

        // 2. Check Payment Status
        if (cashfreeData.order_status !== "PAID") {
            // Payment was not successful (e.g., FAILED, CANCELLED, PENDING)
            return NextResponse.json({
                success: false,
                status: cashfreeData.order_status,
                message: `Payment ${cashfreeData.order_status.toLowerCase()}. Please try again.`,
            }, { status: 400 }); // Use 400 for a failed/unsuccessful payment status
        }

        const paymentSessionId = cashfreeData.payment_session_id; // Get the session ID from Cashfree response

        // 3. Recalculate total amount and apply coupon (server-side re-validation)
        let totalAmount = 0;
        products.forEach((product) => {
           totalAmount += product.price * product.quantity;
        });

        console.log("Total amount before coupon (server-side calculation):", totalAmount);

        if (couponCode) {
			const foundCoupon = await Coupon.findOne({
				code: couponCode,
				userId: user._id,
				isActive: true,
			});
			if (foundCoupon) {
				const discount = totalAmount * (foundCoupon.discountPercentage / 100);
				totalAmount -= Math.round(discount);
				await Coupon.findOneAndUpdate(
					{ code: couponCode, userId: user._id },
					{ isActive: false }
				);
			}
		}

		console.log("Total amount after coupon:", totalAmount);
        

        // 4. Create New Order in your database
        const newOrder = new Order({
            user: user._id,
            products: products.map((p) => ({
                // product ID and price are correctly mapped from your `products` array structure
                product: p._id, // Assuming p._id is the Mongoose ID for the product
                quantity: p.quantity,
                price: p.price,
            })),
            totalAmount,
			razorpaySessionId: paymentSessionId, // still storing sessionId for reference
        });
        
        await newOrder.save();

        // 5. Clear User's Cart
        await User.findByIdAndUpdate(user._id, { $set: { cartItems: [] } });

        // 6. Potentially create a new coupon for the user (loyalty program)
        if (totalAmount >= 1000) { // Example threshold for new coupon
            await createNewCoupon(user._id);
        }

        // 8. Send Success Response
        return NextResponse.json({
            success: true,
            message: "Payment successful, order confirmed",
            orderId: newOrder._id, // Return your internal order ID
        }, { status: 200 });

    } catch (error) {
        console.error("Cashfree success processing failed:", error?.response?.data || error.message);
        const errorMessage = error?.response?.data?.message || "Cashfree success processing failed due to an unexpected error.";
        return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
    }
}


export const POST = protectRoute(cashfreeSuccessHandler);