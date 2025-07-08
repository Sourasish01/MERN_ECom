import { NextResponse } from 'next/server'; // For sending JSON responses

import { connectDB } from '@/lib/db'; // Import your DB connection function

import Product from '@/models/product.model'; // Import your Product Mongoose model (for fetching product details)
import { protectRoute } from '@/middleware/auth.middleware';

// CRUCIAL: Call connectDB here as all cart operations involve the database (User and Product models).
connectDB();


async function addToCartHandler(request) {
    try {
        const { productId } = await request.json(); // Extract productId from request body // await is used to handle async JSON parsing
        const user = request.user; // Authenticated user object from 'protectRoute' middleware

        // Validate productId (optional, but good practice)
        if (!productId) {
            return NextResponse.json({ message: "Product ID is required" }, { status: 400 });
        }

        // Check if the product already exists in the cart
        const existingItem = user.cartItems.find((item) => item.product.toString() === productId);

        if (existingItem) {
            existingItem.quantity += 1; // Increase quantity if found
        } else {
            // Add new item to cart with quantity 1
            user.cartItems.push({ product: productId, quantity: 1 });
        }

        await user.save(); // Save the updated user document with new cart items

        // Return the updated cart items
        return NextResponse.json(user.cartItems, { status: 200 });

    } catch (error) {
        console.error("Error in addToCartHandler:", error.message);
        // Handle Mongoose CastError if productId format is invalid
        if (error.name === 'CastError') {
            return NextResponse.json({ message: "Invalid product ID format" }, { status: 400 });
        }
        return NextResponse.json({ message: "Server error adding to cart", error: error.message }, { status: 500 });
    }
}

// Export the POST method, protected by the 'protect' middleware.
export const POST = protectRoute(addToCartHandler);


// --------------------------------------------------------------------------------------------------------------------------------


async function getCartProductsHandler(request) {
    try {
        const user = request.user; // Authenticated user object from 'protectRoute' middleware

        // Get an array of product IDs from the user's cart
        const productIds = user.cartItems.map((item) => item.product);

        // Fetch all products that are in the user's cart from the Product collection
        // This efficiently fetches multiple products by their IDs.
        const products = await Product.find({ _id: { $in: productIds } });

        // Combine fetched product details with quantities from user's cartItems
        const cartItemsInfo = products.map((product) => {
            const item = user.cartItems.find((cartItem) => cartItem.product.toString() === product.id);
            // .toJSON() converts Mongoose document to a plain JavaScript object
            return { ...product.toJSON(), quantity: item ? item.quantity : 0 };
        });

        // Return the detailed cart information
        return NextResponse.json(cartItemsInfo, { status: 200 });

    } catch (error) {
        console.error("Error in getCartProductsHandler:", error.message);
        return NextResponse.json({ message: "Server error fetching cart", error: error.message }, { status: 500 });
    }
}


export const GET = protectRoute(getCartProductsHandler);


// --------------------------------------------------------------------------------------------------------------------------------
async function deleteFromCartHandler(request) {
    try {
        const { productId } = await request.json(); // Extract productId from request body 
        // {productId} means destructuring the productId from the JSON body
        const user = request.user; // Authenticated user object from 'protectRoute' middleware

        if (!productId) {
            // If no productId is provided in the body, clear the entire cart
            user.cartItems = [];
            console.log("Cart cleared for user:", user.email);
        } else {
            // Filter out the specific product from the cart
            user.cartItems = user.cartItems.filter((item) => item.product.toString() !== productId);
            console.log(`Product ${productId} removed from cart for user:`, user.email);
        }

        await user.save(); // Save the updated user document

        // Return the updated cart items
        return NextResponse.json(user.cartItems, { status: 200 });

    } catch (error) {
        console.error("Error in deleteFromCartHandler:", error.message);
        // Handle Mongoose CastError if productId format is invalid
        if (error.name === 'CastError') {
            return NextResponse.json({ message: "Invalid product ID format" }, { status: 400 });
        }
        return NextResponse.json({ message: "Server error deleting from cart", error: error.message }, { status: 500 });
    }
}


export const DELETE = protectRoute(deleteFromCartHandler);