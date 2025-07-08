import { NextResponse } from 'next/server'; // Import NextResponse for App Router responses
import {connectDB} from '@/lib/db'; // Adjust path to your connectDB function
import User from '@/models/user.model'; // Adjust path to your User model
import bcrypt from 'bcryptjs'; // For password hashing
import { generateToken } from '@/config/utils'; // Adjust path to your generateToken utility

// Establish database connection for this API route handler
connectDB();

export async function POST(request) { // Changed 'req' to 'request'
    try {
        // Parse the request body as JSON
        const { name, email, password } = await request.json(); // Use 'request.json()'

        // ... rest of your logic remains the same, but use 'request' instead of 'req' ...

        // 1. Input Validation
        if (!name || !email || !password) {
            return NextResponse.json({ message: "All fields are required" }, { status: 400 });
            // instead of..... return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
        }

        // 2. Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return NextResponse.json({ message: "Email already exists" }, { status: 400 });
        }

        // 3. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create New User Instance
        const newUser = new User({ //// new User() creates a new user object, where User() only refers to the model, wheras const newUser is an instance of the user object created by the model in backend
            name,
            email,
            password: hashedPassword,
        });

        //When you create a new instance of a Mongoose model (like new User(...)), Mongoose pre-generates the _id for the object, even before it is saved to the database.
        //The newUser._id is already available because Mongoose has pre-generated it.


        if (newUser) {
            // 5. Generate JWT Tokens and Set Cookies
            await generateToken(newUser._id);

            // 6. Save User to Database
            await newUser.save();

            // 7. Send Success Response
            return NextResponse.json(
                {
                    _id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                },
                { status: 201 }
            );
        }
        
        else{
            return NextResponse.json({ message: "Invalid user data" }, { status: 400 });
        }

    } catch (error) {
        console.error("Error on user signup:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}    