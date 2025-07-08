import { NextResponse } from 'next/server'; // Import NextResponse for App Router responses
import {connectDB} from '@/lib/db'; // Adjust path to your connectDB function
import User from '@/models/user.model'; // Adjust path to your User model
import bcrypt from 'bcryptjs'; // For password comparison
import { generateToken } from '@/config/utils'; // Adjust path to your generateToken utility

// Establish database connection for this API route handler
connectDB();

export async function POST(request) {
    try {
        // Parse the request body as JSON
        const { email, password } = await request.json(); // Destructure email and password from the request body in JSON format

        // 1. Input Validation (basic check, more robust validation can be added)
        if (!email || !password) {
            return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
        }

        // 2. Find User by Email
        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
        }

        // 3. Compare Password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
        }

        // 4. Generate JWT Tokens and Set Cookies
        // generateToken now handles setting cookies directly using next/headers cookies() API
        // and does not need 'res' parameter.
        await generateToken(user._id);

        // 5. Send Success Response
        return NextResponse.json(
            {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            { status: 200 } // 200 OK status code for successful login
        );

    } catch (error) {
        console.error("Error in login API route:", error); // Use console.error
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
