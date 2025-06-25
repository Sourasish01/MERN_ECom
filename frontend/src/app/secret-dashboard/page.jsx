'use client';

import React from 'react'
import { BarChart, PlusCircle, ShoppingBasket } from "lucide-react";
import { motion } from "framer-motion";

import { useEffect, useState } from "react";

import AnalyticsTab from "@/components/AnalyticsTab";
import CreateProductForm from "@/components/CreateProductForm";
import ProductsList from "@/components/ProductsList";
import { useProductStore } from "@/store/useProductStore";
import { useUserStore } from "@/store/useUserStore";
import { useRouter } from "next/navigation";



const tabs = [
	{ id: "create", label: "Create Product", icon: PlusCircle },
	{ id: "products", label: "Products", icon: ShoppingBasket },
	{ id: "analytics", label: "Analytics", icon: BarChart },
];


const page = () => {
	const router = useRouter();
	
	const { user, checkingAuth } = useUserStore();

	useEffect(() => {
		// 1. **Crucial Step:** Wait for authentication check to complete.
		if (checkingAuth) { 
			return; // Exit the effect, do nothing yet.
		}

		// 2. Authentication check is done (checkingAuth is false). Now evaluate user status.
		if (!user || user.role !== "admin") {
			router.push("/");
		}
	}, [user, checkingAuth, router]); // Dependency on checkingAuth

	const [activeTab, setActiveTab] = useState("create");


	const { fetchAllProducts } = useProductStore(); // we called the fetchAllProducts function from the store and store it in  products state
													
		useEffect(() => {
			fetchAllProducts();
		}, [fetchAllProducts]);

		// This will be used to fetch all products when the component mounts
		// so when we are on the products tab, we have the products ready to display..
		// or else if we used the same useEffect in ProductsList, it would fetch the products every time we switch to the Products tab,
		//  which is not efficient...and it would cause a flicker effect when switching tabs..
		//  because the fetching would take some time to complete and till then the products would not be displayed...

		// in products tab we just need to use 'products' state from the store ..as it would have already been fetched



  return (
    <div className='min-h-screen relative overflow-hidden'>
			<div className='relative z-10 container mx-auto px-4 py-16'>
				<motion.h1
					className='text-4xl font-bold mb-8 text-emerald-400 text-center'
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
				>
					Admin Dashboard
				</motion.h1>

				<div className='flex justify-center mb-8'>
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center px-2 py-2 mx-2 rounded-md transition-colors duration-200 ${
								activeTab === tab.id
									? "bg-emerald-600 text-white"
									: "bg-gray-700 text-gray-300 hover:bg-gray-600"
							}`}
						>
							<tab.icon className='mr-2 h-5 w-5' />
							{tab.label}
						</button>
					))}
				</div>
				{activeTab === "create" && <CreateProductForm />}
				{activeTab === "products" && <ProductsList />}
				{activeTab === "analytics" && <AnalyticsTab />}
			</div>
		</div> 
  )
}

export default page
