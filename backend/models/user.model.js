import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Name is required"],
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: [true, "Password is required"],
			minlength: [6, "Password must be at least 6 characters long"],
		},
		cartItems: [
			{
				quantity: {
					type: Number,
					default: 1,
				},
				product: {
					type: mongoose.Schema.Types.ObjectId, // to refer to the Product model
					ref: "Product", // to refer to the Product model
				},
			},
		],
		role: {
			type: String,
			enum: ["customer", "admin"], // enum means string objects, here we have only two roles for user
			default: "customer", // default role is customer
		},
	},
	{
		timestamps: true, // for createdAt and updatedAt fields
	}
);

const User = mongoose.model("User", userSchema);

export default User;