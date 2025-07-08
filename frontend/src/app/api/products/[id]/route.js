import { NextResponse } from 'next/server';
import { protectRoute, adminRoute } from '@/middleware/auth.middleware'; 
import { connectDB } from '@/lib/db'; 
import Product from '@/models/product.model'; 
import cloudinary from '@/lib/cloudinary';
import { redis } from '@/lib/redis'; // Adjust path for Redis

// CRUCIAL: Call connectDB here as this route will interact with the database.
connectDB();

async function deleteProductHandler(request, context) { 
    try {
        const { id } = await context.params; // Extract the product ID from the dynamic route parameter
        // id is taken from the URL, e.g., /api/products/12345

        // 1. Find the product by ID
        const product = await Product.findById(id);

        if (!product) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }

        // 2. If product has an image, delete it from Cloudinary
        if (product.image) {
            // Extract public ID from the Cloudinary URL
            const publicId = product.image.split("/").pop().split(".")[0];

            try {
                // Cloudinary destroy method expects the full path within the folder
                await cloudinary.uploader.destroy(`products/${publicId}`);////This deletes the image from Cloudinary using cloudinary.uploader.destroy(publicId)
                // When you upload an image to a specific folder in Cloudinary (as you did with { folder: "products" } during the upload), its public_id includes the folder path.
                // If you upload an image my_pic.jpg to the products folder, its full public ID becomes products/my_pic.
                //Therefore, when you want to delete it, you must provide the full public ID including the folder prefix
                console.log(`Deleted image 'products/${publicId}' from Cloudinary`);
            } catch (error) {
                console.error("Error deleting image from Cloudinary:", error.message);
                // Decide if you want to abort product deletion or continue if image deletion fails.
                // For now, we log and continue to delete the product from DB.
            }
        }

        // 3. Delete the product from the database
        await Product.findByIdAndDelete(id);
        //await waits for MongoDB to respond before moving to the next line.
        //If the document is found and deleted:...MongoDB returns the deleted document. ...await waits until MongoDB sends this response.
        //MongoDB returns null, meaning nothing was deleted.
        //If there is an error (e.g., invalid ID format):....MongoDB throws an error, and await ensures it's caught in the catch block.

        // 4. Return success response
        return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });

    } catch (error) {
        console.error("Error in deleteProductHandler:", error.message);
        // Handle Mongoose cast errors (e.g., invalid ID format) gracefully
        if (error.name === 'CastError') {
            return NextResponse.json({ message: "Invalid product ID format" }, { status: 400 });
        }
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}
export const DELETE = protectRoute(adminRoute(deleteProductHandler));

// ----------------------------------------------------------------------------------------------------

// This function is used to update the cache of featured products in Redis.
async function updateFeaturedProductsCache() {
    try {
        // The .lean() method is used to return plain JavaScript objects instead of full Mongoose documents.
        // This can significantly improve performance for read operations.
        const featuredProducts = await Product.find({ isFeatured: true }).lean();

        // Saves the featured products in Redis as a JSON string.
        // This ensures that real-time changes are reflected in the frontend without waiting for a fresh database query.
        await redis.set("featured_products", JSON.stringify(featuredProducts));
        console.log("Featured products cache updated in Redis.");
    } catch (error) {
        console.error("Error in updateFeaturedProductsCache function:", error.message);
        // Do not re-throw here, as cache update failure shouldn't block the main product update.
    }
}

async function toggleProductFeaturedStatusHandler(request, { params }) { // <--- NAMED DIFFERENTLY HERE!
    try {
        const { id } = params; // Extract the product ID from the dynamic route parameter

        // 1. Find the product by ID
        const product = await Product.findById(id);

        if (!product) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }

        // 2. Toggle the 'isFeatured' status
        product.isFeatured = !product.isFeatured;

        // 3. Save the updated product to the database
        const updatedProduct = await product.save();

        // 4. Update the featured products cache in Redis
        await updateFeaturedProductsCache();

        // 5. Return the updated product data
        return NextResponse.json(updatedProduct, { status: 200 });

    } catch (error) {
        console.error("Error in toggleProductFeaturedStatusHandler:", error.message); // Updated console.error name
        if (error.name === 'CastError') {
            return NextResponse.json({ message: "Invalid product ID format" }, { status: 400 });
        }
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
    }
}

export const PATCH = protectRoute(adminRoute(toggleProductFeaturedStatusHandler)); 


