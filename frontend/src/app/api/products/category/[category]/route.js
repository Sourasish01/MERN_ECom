import { NextResponse } from 'next/server'; // For sending JSON responses
import { connectDB } from '@/lib/db'; // Adjust path to your DB connection function
import Product from '@/models/product.model'; // Adjust path to your Product Mongoose model

// CRUCIAL: Call connectDB here as this route will interact with the database.
connectDB();

export async function GET(request, context) {  // instead of GET(request, { params }) ...use GET(request, context)
    try {

        // instead of this ....const { category } = params; // Extract the category from the dynamic route parameter
        
        // Await the params object before destructuring
        const { category } = await context.params; // <--- FIX IS HERE: `await context.params`

        // 1. Fetch products from MongoDB based on the category
        // The category field in your Product model should match the value from the URL.
        const products = await Product.find({ category });
        // products is an array of products objects that match the category

        // 2. Check if any products were found for the category
        if (!products || products.length === 0) {
            // Return 404 if no products are found for the given category
            return NextResponse.json({ message: `No products found for category: ${category}` }, { status: 404 });
        }

        // 3. Return the products as a JSON response
        return NextResponse.json({ products }, { status: 200 });

    } catch (error) {
        console.error("Error in getProductsByCategory API route:", error.message);
        // This catch block handles any unexpected server-side errors during the process.
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}