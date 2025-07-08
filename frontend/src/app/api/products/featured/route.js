import { NextResponse } from 'next/server'; // For sending JSON responses
import { connectDB } from '@/lib/db'; // Import your DB connection function
import Product from '@/models/product.model'; // Adjust path to your Product Mongoose model
import { redis } from '@/lib/redis'; // Adjust path to your Redis client setup

// CRUCIAL: Call connectDB here as this route will interact with the database (MongoDB)
// if the data is not found in Redis.
connectDB();

export async function GET(request) {
    try {
        let featuredProducts;

        // 1. Check Redis cache
        const cachedFeaturedProducts = await redis.get("featured_products"); // check if the featured products are stored in redis

        if (cachedFeaturedProducts) {
            console.log("Featured products fetched from Redis cache.");
            // Parse the JSON string retrieved from Redis
            return NextResponse.json(JSON.parse(cachedFeaturedProducts), { status: 200 });// if the featured products are stored in redis, return the products
           //This improves response speed and reduces MongoDB queries.
        }

        // 2. If not in Redis, fetch from MongoDB
        console.log("Featured products not in cache, fetching from MongoDB...");
        // .lean() returns plain JavaScript objects, which is good for performance
        featuredProducts = await Product.find({ isFeatured: true }).lean();

        if (!featuredProducts || featuredProducts.length === 0) {
            return NextResponse.json({ message: "No featured products found" }, { status: 404 });
        }

        // 3. Store in Redis for future quick access
        // Convert the array of plain objects to a JSON string before storing in Redis
        await redis.set("featured_products", JSON.stringify(featuredProducts)); //Saves the fetched products in Redis (as a JSON string).
        console.log("Featured products fetched from MongoDB and cached in Redis.");

        // 4. Return the featured products
        return NextResponse.json(featuredProducts, { status: 200 });

    } catch (error) {
        console.error("Error in getFeaturedProducts API route:", error.message);
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}