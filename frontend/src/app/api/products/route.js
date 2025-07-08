import { NextResponse } from 'next/server'; // For sending JSON responses
import { protectRoute, adminRoute } from '@/middleware/auth.middleware'; // Import your middleware HOFs
import { connectDB } from '@/lib/db'; // Import your DB connection function
import Product from '@/models/product.model'; // Adjust path to your Product Mongoose model
import cloudinary from '@/lib/cloudinary'; // <-- IMPORT YOUR CONFIGURED CLOUDINARY INSTANCE

// CRUCIAL: Call connectDB here as the handler (and potentially middleware)
// will interact with the database.
connectDB();

/* NOTE>><
In Next.js 15 App Router, you handle different HTTP methods for the same route path within the same route.js file.

So, you'll add this new POST function right next to your GET function in:
frontend/src/app/api/products/route.js
*/

// ----------------------------------------------------------------------------------------------------

async function getAllProductsHandler(request) {
    try {
        const products = await Product.find({}); // Fetch all products from MongoDB
        return NextResponse.json({ products }, { status: 200 }); ////{products} is an object with all the products json objects as an array

    } catch (error) {
        console.error("Error in getAllProductsHandler:", error.message);
        // This catch block handles errors occurring during the product fetching itself.
        return NextResponse.json({ message: "Server error fetching products", error: error.message }, { status: 500 });
    }
}

export const GET = protectRoute(adminRoute(getAllProductsHandler));


// Export the GET method, chaining the 'protect' and 'admin' middleware HOFs.
// The order is important:
// 1. `adminRoute(getAllProductsHandler)`: This creates a function that first checks if the user is an admin,
//    and if so, calls `getAllProductsHandler`.
// 2. `protectRoute(...)`: This wraps the function from step 1. It first authenticates the user,
//    and if successful, calls the function from step 1.
// So, the flow is: Request -> ProtectRoute (authenticate) -> AdminRoute (authorize) -> getAllProductsHandler.

// ----------------------------------------------------------------------------------------------------

async function createProductHandler(request) {
    try {
        const { name, description, price, image, category } = await request.json(); // instead of request.body, use request.json() to parse JSON body in next.js

        if (!name || !description || !price || !category) {
            return NextResponse.json({ message: "Missing required product fields" }, { status: 400 });
        }

        let cloudinaryResponse = null;

        if (image) {
            // Use the imported 'cloudinary' instance directly
            cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
        }

        const product = await Product.create({ //Creates a new product in the database and returns the product data.
            name,
            description,
            price,
            image: cloudinaryResponse?.secure_url || "",
            category,
        });

        return NextResponse.json(product, { status: 201 });

    } catch (error) {
        console.error("Error in createProductHandler:", error.message);
        return NextResponse.json({ message: "Server error creating product", error: error.message }, { status: 500 });
    }
}

// Export the POST method, chaining the 'protect' and 'admin' middleware HOFs.
export const POST = protectRoute(adminRoute(createProductHandler));