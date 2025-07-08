import { NextResponse } from 'next/server'; // For sending JSON responses
import { connectDB } from '@/lib/db'; // Import your DB connection function
import Product from '@/models/product.model'; // Adjust path to your Product Mongoose model

// CRUCIAL: Call connectDB here as this route will interact with the database.
connectDB();

export async function GET(request) {
    try {
        // Fetching Random Products using MongoDB Aggregation Pipeline
        const products = await Product.aggregate([
            {
                // $sample selects a random sample of objects from its input.
                $sample: { size: 4 }, // Get 4 random products objects
            },
            {
                // $project reshapes each product object to include only the specified fields.
                $project: {
                    _id: 1,         // Include the product ID
                    name: 1,        // Include the product name
                    description: 1, // Include the product description
                    image: 1,       // Include the product image URL
                    price: 1,       // Include the product price
                    // We are explicitly excluding other fields like 'category', 'isFeatured', 'createdAt', 'updatedAt'
                },
            },
        ]);

        // If no products are found, you might want to return an empty array or a specific message.
        // For $sample, if there are fewer than 'size' documents, it returns all of them.
        if (!products || products.length === 0) {
            return NextResponse.json({ message: "No recommended products found" }, { status: 200 }); // Or 404, depending on desired behavior for no products
        }

        // Return the products as a JSON response
        return NextResponse.json(products, { status: 200 });

    } catch (error) {
        console.error("Error in getRecommendedProducts API route:", error.message);
        // This catch block handles any unexpected server-side errors during the process.
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}