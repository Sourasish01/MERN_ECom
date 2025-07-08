
import { NextResponse } from 'next/server'; 
import { protectRoute, adminRoute } from '@/middleware/auth.middleware'; 
import { connectDB } from '@/lib/db'; 
import Product from '@/models/product.model'; // Adjust path to your Product Mongoose model
import Order from '@/models/order.model';   
import User from '@/models/user.model';     



connectDB();


// This function generates an array of date strings (YYYY-MM-DD) within a given range.
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


// This function fetches overall analytics data like total users, products, sales, and revenue.
const getAnalyticsData = async () => {
    // Count total number of users
    const totalUsers = await User.countDocuments();
    // Count total number of products
    const totalProducts = await Product.countDocuments();

    // Aggregate sales data to calculate total sales (number of orders) and total revenue.
    const salesData = await Order.aggregate([
        {
            // Group all documents together to get overall sums.
            $group: {
                _id: null, // Groups all documents into a single group
                totalSales: { $sum: 1 }, // Count each order as one sale
                totalRevenue: { $sum: "$totalAmount" }, // Sum the totalAmount from all orders
            },
        },
    ]);

    let total_Sales = 0;
    let total_Revenue = 0;

    // Check if salesData array is not empty and has a first element
    if (salesData.length > 0 && salesData[0] !== null) {
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

/// This function fetches daily sales and revenue data within a specified date range.
const getDailySalesData = async (startDate, endDate) => {
    try {
        const dailySalesData = await Order.aggregate([
            {
                // Match orders within the specified date range (createdAt field).
                $match: {
                    createdAt: {
                        $gte: startDate, // Greater than or equal to start date
                        $lte: endDate,   // Less than or equal to end date
                    },
                },
            },
            {
                // Group orders by date (YYYY-MM-DD format) to sum sales and revenue for each day.
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by date string
                    sales: { $sum: 1 },         // Count orders for the day
                    revenue: { $sum: "$totalAmount" }, // Sum totalAmount for the day
                },
            },
            {
                // Sort the results by date in ascending order.
                $sort: { _id: 1 },
            },
        ]);

        // example of dailySalesData
		// [
		// 	{
		// 		_id: "2024-08-18",
		// 		sales: 12,
		// 		revenue: 1450.75
		// 	},
		// ]

		// Generate a complete array of dates within the range, including days with no sales.
        const dateArray = getDatesInRange(startDate, endDate);
        console.log(dateArray) // ['2024-08-18', '2024-08-19', ... ]


        // Map the complete date array to include sales and revenue data, defaulting to 0 if no sales.
        return dateArray.map((date) => {
            const foundData = dailySalesData.find((item) => item._id === date);

            return {
                date,
                sales: foundData?.sales || 0,
                revenue: foundData?.revenue || 0,
            };
        });
    } catch (error) {
        console.error("Error in getDailySalesData:", error.message);
        throw error; // Re-throw to be caught by the main route handler's try/catch
    }
};

async function getAnalyticsHandler(request) {
    try {
        // Fetch overall analytics data
        const analyticsData = await getAnalyticsData();

        // Define date range for daily sales data (last 7 days)
        const endDate = new Date();
        // Calculate start date (7 days ago from endDate)
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Fetch daily sales data for the defined range
        const dailySalesData = await getDailySalesData(startDate, endDate);

        console.log("Analytics Data (for response):", analyticsData);
        console.log("Daily Sales Data (for response):", dailySalesData);

        // Return the combined analytics data as a JSON response
        return NextResponse.json({
            analyticsData,
            dailySalesData,
        }, { status: 200 });

    } catch (error) {
        console.error("Error in getAnalyticsHandler:", error.message);
        return NextResponse.json({ message: "Server error fetching analytics", error: error.message }, { status: 500 });
    }
}

export const GET = protectRoute(adminRoute(getAnalyticsHandler));