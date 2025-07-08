import mongoose from "mongoose";

export const connectDB = async () => { // connect to MongoDB
	
	// mongoose.connections[0].readyState checks the state of the default connection
    if (mongoose.connections[0].readyState) {
        console.log('MongoDB already connected');
        return; // Exit if already connected
    }

	try {
		const conn = await mongoose.connect(process.env.MONGO_URI);
		console.log(`MongoDB connected: ${conn.connection.host}`); //will show the host of the connection in the console
	} catch (error) {
		console.log("Error connecting to MONGODB", error.message);
		process.exit(1);
	}
};