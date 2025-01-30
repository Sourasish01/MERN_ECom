import express from 'express';
import dotenv from 'dotenv';
import User from "./models/user.model.js";
import bcrypt from "bcryptjs";

import { connectDB } from "./lib/db.js";
import { generateToken } from "./config/utils.js";


dotenv.config(); // to access the .env file

const PORT = process.env.PORT; // to access the port from the .env file

const app = express();

app.use(express.json()); // to get hold of the JSON data from the body of the request





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






app.listen(PORT, () => {
    console.log('Server is running on http://localhost:' + PORT);
    connectDB();
});

