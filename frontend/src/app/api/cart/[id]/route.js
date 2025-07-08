import { NextResponse } from 'next/server'; // For sending JSON responses
import { connectDB } from '@/lib/db'; // Adjust path to your DB connection function
import { protectRoute } from '@/middleware/auth.middleware';


connectDB();

async function updateCartItemQuantityHandler(request, context) {
    try {
        const { id: productId } = await context.params; // Extract productId from the dynamic route parameter
        const { quantity } = await request.json(); // Extract new quantity from request body
        const user = request.user; // Authenticated user object from 'protect' middleware


        // Find the item in the cart
        const existingItem = user.cartItems.find((item) => item.product.toString() === productId);

        if (!existingItem) {
            // Product not found in the user's cart
            return NextResponse.json({ message: "Product not found in cart" }, { status: 404 });
        }

        // Update logic
        if (quantity === 0) {
            // Remove item from cart if quantity is 0
            user.cartItems = user.cartItems.filter((item) => item.product.toString() !== productId);
        } else {
            // Update the quantity of the existing item
            existingItem.quantity = quantity;
        }

        await user.save(); // Save the updated user document

        // Return the updated cart items
        return NextResponse.json(user.cartItems, { status: 200 });

    } catch (error) {
        console.error("Error in updateCartItemQuantityHandler:", error.message);
        // Handle Mongoose CastError (e.g., invalid productId format) gracefully
        if (error.name === 'CastError') {
            return NextResponse.json({ message: "Invalid product ID format" }, { status: 400 });
        }
        return NextResponse.json({ message: "Server error updating cart quantity", error: error.message }, { status: 500 });
    }
}

export const PUT = protectRoute(updateCartItemQuantityHandler);