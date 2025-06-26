import express from 'express';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "./models/user.model.js";
import Product from "./models/product.model.js";
import Coupon from "./models/coupon.model.js";
import Order from "./models/order.model.js";
import cloudinary from "./lib/cloudinary.js";



import { connectDB } from "./lib/db.js";
import { generateToken } from "./config/utils.js";
import { redis } from "./lib/redis.js";
import { adminRoute, protectRoute } from "./middleware/auth.middleware.js";


dotenv.config(); // to access the .env file


// STARTING THE SERVER & CONNECTING TO THE DATABASE

const PORT = process.env.PORT; // to access the port from the .env file

const app = express();

app.listen(PORT, () => {
    console.log('Server is running on http://localhost:' + PORT);
    connectDB();
});



import cors from "cors";

// ✅ Apply CORS First
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// ✅ Then body parser (with larger limit)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Then cookie parser
app.use(cookieParser());






//AUTHENTICATION ROUTES

app.post("/api/auth/signup", async (req, res) => {

    const { name, email, password } = req.body;

    try {
        if (!name || !email || !password) {
          return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }


        const user = await User.findOne({ email }); // check if user already exists in the database in  the User collection. 
		// here .User is the model/collection and findOne() is a method of the model
        if (user) return res.status(400).json({ message: "Email already exists" });


        const salt = await bcrypt.genSalt(10); // generate a salt with 10 rounds
        const hashedPassword = await bcrypt.hash(password, salt); // hash the password with the salt


        const newUser = new User({ // new User() creates a new user object, where User() only refers to the model, wheras const newUser is an instance of the user object created by the model in backend
            name,
            email,
            password: hashedPassword,
          });


          //When you create a new instance of a Mongoose model (like new User(...)), Mongoose pre-generates the _id for the object, even before it is saved to the database.
          //The newUser._id is already available because Mongoose has pre-generated it.

          if (newUser) {
            // generate jwt token here
            await generateToken(newUser._id, res); //_id is the unique id of the user in the database, that is how mongoDB identifies the user
            
            await newUser.save(); // save the user to the database only if the user is created successfully and the jwt token is generated 
      
            return res.status(201).json({ // send the user data as a response to the client if the user is created successfully
              _id: newUser._id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
            });
          } else {
            res.status(400).json({ message: "Invalid user data" });
          }

    }  

    catch (error) {
        console.log("Error on user signup", error);
        res.status(500).json({ message: "Internal server error" });
    } 
});


app.post("/api/auth/login", async (req, res) => {
  
    
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }); // check if user exists in the database. here User is the model/collection and findOne() is a method of the model

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    await generateToken(user._id, res);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } 
  catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }


});



app.post("/api/auth/logout", async (req, res) => {
    
  try {
		const refreshToken = req.cookies.refreshtoken123; // here we get the jwt refresh token value from the refreshtoken123 cookie in the request
		if (refreshToken) {
			const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET); // If a refresh token exists, it is verified using the secret key (REFRESH_TOKEN_SECRET).
      //If the token is valid, jwt.verify returns the decoded payload, which typically contains user information such as userId.
			await redis.del(`refresh_token:${decoded.userId}`);//The refresh token associated with the user's userId is deleted from Redis.
      //This effectively logs the user out by invalidating the refresh token. This ensures that the refresh token cannot be used again to generate a new access token.
		}

		res.clearCookie("accesstoken123"); //Both accessToken and refreshToken cookies are cleared from the client.
		res.clearCookie("refreshtoken123"); //Both accessToken and refreshToken cookies are cleared from the client.
		res.json({ message: "Logged out successfully" }); //A success message is sent back to the client indicating a successful logout.
	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}

});



app.post("/api/auth/refresh-accesstoken", async (req, res) => {

  try {
		const refreshToken = req.cookies.refreshtoken123; // here we get the jwt refresh token value from the refreshtoken123 cookie in the request

		if (!refreshToken) {
			return res.status(401).json({ message: "No refresh token provided" });
		}

		const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET); //// If a refresh token exists, it is verified using the secret key (REFRESH_TOKEN_SECRET).
    //If the token is valid, jwt.verify returns the decoded payload, which typically contains user information such as userId.
		const storedToken = await redis.get(`refresh_token:${decoded.userId}`);//The server fetches the refresh token stored in Redis.

		if (storedToken !== refreshToken) { //If the refresh token in the request does not match the refresh token stored in Redis, an error is returned.
			return res.status(401).json({ message: "Invalid refresh token" });
		}

		const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, { //If the refresh token is valid, a new access token is generated.
      expiresIn: "15m",
    });

		res.cookie("accesstoken123", accessToken, { //The new access token is sent back as a cookie.
			httpOnly: true,
			secure: process.env.NODE_ENV !== "development",
			sameSite: "strict",
			maxAge: 15 * 60 * 1000,
		});

		res.json({ message: "Token refreshed successfully" });
	}
  catch (error) {
		console.log("Error in refreshToken controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
});



app.get("/api/auth/profile", protectRoute, async (req, res) => {
  try {
		res.json(req.user);
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
});


// PRODUCT ROUTES


app.get("/api/products/", protectRoute, adminRoute, async (req, res) =>{ //This route is used to fetch all products from the database.
                                                                         // It only allows authenticated admin users to access the products.
  try {
		const products = await Product.find({}); // find all products
		res.json({ products }); //{produtcs} is an object with all the produtcs json objects as an array
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
});


app.get("/api/products/featured", async (req, res) => {
  try {
		let featuredProducts = await redis.get("featured_products"); // check if the featured products are stored in redis
		if (featuredProducts) {                           
			return res.json(JSON.parse(featuredProducts));    // if the featured products are stored in redis, return the products
      //This improves response speed and reduces MongoDB queries.
		}

		// if not in redis, fetch from mongodb
		// .lean() is gonna return a plain javascript object instead of a mongodb document
		// which is good for performance
		featuredProducts = await Product.find({ isFeatured: true }).lean(); // will only get triggered when if statement above is not fulfilled

		if (!featuredProducts) {
			return res.status(404).json({ message: "No featured products found" });
		}

		// store in redis for future quick access

		await redis.set("featured_products", JSON.stringify(featuredProducts)); //Saves the fetched products in Redis (as a JSON string).
    //The key is "featured_products".
    //This is done so that the next time the route is accessed, the products can be fetched from Redis instead of MongoDB.
    //This improves response speed and reduces MongoDB queries.

		res.json(featuredProducts);
	} catch (error) {
		console.log("Error in getFeaturedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
});



app.post("/api/products/", protectRoute, adminRoute, async (req, res) => { //This route is used to create a new product in the database.


  try {
		const { name, description, price, image, category } = req.body;

		let cloudinaryResponse = null;

		if (image) {
			cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" }); //Uploads the image to Cloudinary.
		}

		const product = await Product.create({ //Creates a new product in the database and returns the product data.
			name,
			description,
			price,
			image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "", 
			category,
		});

		res.status(201).json(product);
	} catch (error) {
		console.log("Error in createProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
});



app.delete("/api/products/:id", protectRoute, adminRoute, async (req, res) => { //This route is used to delete a product from the database , as well as from cloudinary
  
  try {
		const product = await Product.findById(req.params.id); // req.params.id is the id of the product to be deleted , which is sent in the request
    //req.params.id is taken from the request URL (/products/:id).
    // The await keyword ensures that the database query completes before moving forward.

		if (!product) {                          //If the product is not found in the database, a 404 response is sent with a message: "Product not found".
			return res.status(404).json({ message: "Product not found" });
		}
		if (product.image) { //If the product has an associated image, we extract the public ID of cloudinary from its URL.
			const publicId = product.image.split("/").pop().split(".")[0];
			try {
				await cloudinary.uploader.destroy(`products/${publicId}`); //This deletes the image from Cloudinary using cloudinary.uploader.destroy(publicId).
				console.log("deleted image from cloudinary");
			} catch (error) {
				console.log("error deleting image from cloudinary", error);
			}
		}
		await Product.findByIdAndDelete(req.params.id); //Deletes the product from the database.
    //await waits for MongoDB to respond before moving to the next line.
    //If the document is found and deleted:...MongoDB returns the deleted document. ...await waits until MongoDB sends this response.
    //MongoDB returns null, meaning nothing was deleted.
    ////If there is an error (e.g., invalid ID format):....MongoDB throws an error, and await ensures it's caught in the catch block.

		res.json({ message: "Product deleted successfully" });//Sends a success response back to the client.

	} catch (error) { // error cathch handling block
		console.log("Error in deleteProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}

});


app.get("/api/products/recommendations", async (req, res) => { //This route is used to fetch recommended products from the database. ..it is a public route, open to all
  try {
		const products = await Product.aggregate([ // Fetching Random Products using MongoDB Aggregation
			{
				$sample: { size: 4 },
			},
			{
				$project: {
					_id: 1,
					name: 1,
					description: 1,
					image: 1,
					price: 1,
				},
			},
		]);

		res.json(products);
	} catch (error) {
		console.log("Error in getRecommendedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}

});


app.get("/api/products/category/:category", async (req, res) => { //This route is used to fetch products by category from the database.
//  ..it is a public route, open to all
  
  const { category } = req.params;
	try {
		const products = await Product.find({ category });
		res.json({ products });
	} catch (error) {
		console.log("Error in getProductsByCategory controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}

});  


app.patch("/api/products/:id", protectRoute, adminRoute, async (req, res) => { //This route is used to update a product in the database ,
//  ie the feauted status of the product

  try {
		const product = await Product.findById(req.params.id);
		if (product) {
			product.isFeatured = !product.isFeatured;
			const updatedProduct = await product.save();

			await updateFeaturedProductsCache(); //updateFeaturedProductsCache() is likely a function that updates a cached version of featured products.
      //This ensures that real-time changes are reflected in the frontend without waiting for a fresh database query.
			res.json(updatedProduct);
		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in toggleFeaturedProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}

});  


async function updateFeaturedProductsCache() { //This function is used to update the cache of featured products in Redis.
	try {
		// The lean() method  is used to return plain JavaScript objects instead of full Mongoose documents. This can significantly improve performance
		const featuredProducts = await Product.find({ isFeatured: true }).lean();//Product.find({ isFeatured: true }) → Queries MongoDB to get all products
    //  where isFeatured = true.
		//.lean() → Converts Mongoose documents into plain JavaScript objects instead of full Mongoose models.

    await redis.set("featured_products", JSON.stringify(featuredProducts)); // Saves the featured products in Redis as a JSON string.

	} catch (error) {
		console.log("error in update cache function");
	}
};


// CART ROUTES 

app.post("/api/cart/", protectRoute, async (req, res) => { //This route is used to add a product to the cart of the authenticated user.
  try {
		const { productId } = req.body;
		const user = req.user;

		const existingItem = user.cartItems.find((item) => item.product.toString() === productId);//

		if (existingItem) {
      existingItem.quantity += 1; // Increase quantity if the product is already in the cart
    } else {
      user.cartItems.push({ product: productId, quantity: 1 }); // Correct: adding both product ID and quantity
    }

		await user.save();

		res.json(user.cartItems);

	} catch (error) {
		console.log("Error in addToCart controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
});



app.get("/api/cart/", protectRoute, async (req, res) => { //This route is used to fetch the cart of the authenticated user.
  
  try {
		const productIds = req.user.cartItems.map((item) => item.product);
        const products = await Product.find({ _id: { $in: productIds } }); //all products in the user's cart are fetched from the  product collection in database:
		// as each user has a cartItems array which contains the product ids of the products linked to the product collection in the database

		// add quantity for each product
		const cartItemsInfo = products.map((product) => {
			const item = req.user.cartItems.find((item) => item.product.toString() === product.id);
			return { ...product.toJSON(), quantity: item.quantity };
		});

		res.json(cartItemsInfo);
    
	} catch (error) {
		console.log("Error in getCartProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}

});




app.put("/api/cart/:id", protectRoute, async (req, res) => { //This route is used to update the existing quantity of cart product of the authenticated user.

  try {
		const { id: productId } = req.params;
		const { quantity } = req.body;
		const user = req.user;
		const existingItem = user.cartItems.find((item) => item.product.toString() === productId); // Find the item in the cart


		if (existingItem) {
			if (quantity === 0) {
				user.cartItems = user.cartItems.filter((item) => item.product.toString() !== productId); // Remove item if quantity is 0
				await user.save();
				return res.json(user.cartItems);
			}

			existingItem.quantity = quantity;  // Update the quantity of the existing item
			await user.save();
			res.json(user.cartItems);
		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in updateQuantity controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });

	}
});

app.delete("/api/cart/", protectRoute, async (req, res) => { //This route is used to delete a product from the cart of the authenticated user.
  try {
		const { productId } = req.body; // from frontend 
		const user = req.user; // from the protectRoute middleware, req.user is the authenticated user object
		
    if (!productId) {
			user.cartItems = []; // Clear the cart if no productId is provided
		} else {
			user.cartItems = user.cartItems.filter((item) => item.product.toString() !== productId);// 

		}

		await user.save(); 

		res.json(user.cartItems);

	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}

});



// COUPON ROUTES

app.get("/api/coupons/", protectRoute,  async (req, res) => {  //This API endpoint is used to fetch an active coupon for the authenticated user.

	try {
		const coupon = await Coupon.findOne({ userId: req.user._id, isActive: true });
		res.json(coupon || null);
	} catch (error) {
		console.log("Error in getCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
 
});

app.get("/api/coupons/validate", protectRoute, async (req, res) => { // This API endpoint is used to validate a coupon code for the authenticated user.

	try {
		const { code } = req.body;
		const coupon = await Coupon.findOne({ code: code, userId: req.user._id, isActive: true });

		if (!coupon) {
			return res.status(404).json({ message: "Coupon not found" });
		}

		if (coupon.expirationDate < new Date()) {
			coupon.isActive = false;
			await coupon.save();
			return res.status(404).json({ message: "Coupon expired" });
		}

		res.json({
			message: "Coupon is valid",
			code: coupon.code,
			discountPercentage: coupon.discountPercentage,
		});
	} catch (error) {
		console.log("Error in validateCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}

});	


// PAYMENT ROUTES




//ANALYTICAL ROUTES

app.get("/api/analytics/", protectRoute, adminRoute, async (req, res) => {

	try {
		const analyticsData = await getAnalyticsData();

		const endDate = new Date();
		const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

		const dailySalesData = await getDailySalesData(startDate, endDate);

		res.json({
			analyticsData,
			dailySalesData,
		});
	} catch (error) {
		console.log("Error in analytics route", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}

});


const getAnalyticsData = async () => {
	const totalUsers = await User.countDocuments();
	const totalProducts = await Product.countDocuments();

	const salesData = await Order.aggregate([
		{
			$group: {
				_id: null, // it groups all documents together,
				totalSales: { $sum: 1 },
				totalRevenue: { $sum: "$totalAmount" },
			},
		},
	]);

	let total_Sales = 0;
	let total_Revenue = 0;

	if (salesData[0] != null) { 
		total_Sales = salesData[0].totalSales; 
		total_Revenue = salesData[0].totalRevenue; 
	}
	  
	return {
		users: totalUsers,
		products: totalProducts,
		total_Sales,
		total_Revenue,
	};
};



const getDailySalesData = async (startDate, endDate) => {
	try {
		const dailySalesData = await Order.aggregate([
			{
				$match: {
					createdAt: {
						$gte: startDate,
						$lte: endDate,
					},
				},
			},
			
			{
				$group: {
					_id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
					sales: { $sum: 1 },
					revenue: { $sum: "$totalAmount" },
				},
			},
			{ $sort: { _id: 1 } },
		]);

		// example of dailySalesData
		// [
		// 	{
		// 		_id: "2024-08-18",
		// 		sales: 12,
		// 		revenue: 1450.75
		// 	},
		// ]

		const dateArray = getDatesInRange(startDate, endDate);
		// console.log(dateArray) // ['2024-08-18', '2024-08-19', ... ]

		return dateArray.map((date) => {
			const foundData = dailySalesData.find((item) => item._id === date);

			return {
				date,
				sales: foundData?.sales || 0,
				revenue: foundData?.revenue || 0,
			};
		});
	} catch (error) {
		throw error;
	}
};


function getDatesInRange(startDate, endDate) { // we are taking the start and end date as javascript date objects
	const dates = []; //// Step 1: Create an empty array to store dates



    // startDate is already a Date object, not a string.
	// new Date(startDate) ensures that currentDate is a new Date object, independent of startDate.

	// If startDate were a string, JavaScript would try to convert it into a Date object inside new Date(startDate).
	// it will still work, currentDate will be a Date object, but it's better to pass a Date object to new Date().
	
	let currentDate = new Date(startDate);

	// in JavaScript, when you assign an object (including a Date object) to another variable, it does not create a new copy.
	//  Instead, it stores a reference to the same object in memory.
	//This means that if you modify one variable, the changes will reflect in the other because both are pointing to the same object.
	
	//if let currentDate = startDate; currentDate would reference the same object as startDate.
	//Modifying currentDate would also modify startDate, causing unintended bugs.



	while (currentDate <= endDate) { ////  Loop until currentDate passes endDate

		dates.push(currentDate.toISOString().split("T")[0]); //✅ This converts the currentDate into a string in the format YYYY-MM-DD and adds it to the dates array.
		//Converts the Date object into an ISO 8601 string format (e.g., "2024-08-18T00:00:00.000Z").
		//Splits the string at "T" and takes the first part (before T), which is just the date (e.g., "2024-08-18").
		currentDate.setDate(currentDate.getDate() + 1); //This increments the currentDate by one day, so the loop continues processing the next date.
	}

	return dates;
}


  



