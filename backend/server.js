import express from 'express';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "./models/user.model.js";
import Product from "./models/product.model.js";



import { connectDB } from "./lib/db.js";
import { generateToken } from "./config/utils.js";
import { redis } from "./lib/redis.js";
import { adminRoute, protectRoute } from "./middleware/auth.middleware.js";


dotenv.config(); // to access the .env file

const PORT = process.env.PORT; // to access the port from the .env file

const app = express();

app.use(express.json()); // to get hold of the JSON data from the body of the request

app.use(cookieParser()); // to get hold of the cookies from the request





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


        const user = await User.findOne({ email }); // check if user already exists in the database
        if (user) return res.status(400).json({ message: "Email already exists" });


        const salt = await bcrypt.genSalt(10); // generate a salt with 10 rounds
        const hashedPassword = await bcrypt.hash(password, salt); // hash the password with the salt


        const newUser = new User({ // new User() creates a new user object, where User() only refers to the model, wheras const newUser is an instance of the user object created by the model
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



app.get("/api/auth/profile", async (req, res) => {
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
		res.json({ products });
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
});



app.listen(PORT, () => {
    console.log('Server is running on http://localhost:' + PORT);
    connectDB();
});

