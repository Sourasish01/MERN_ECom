"use client";

import { ArrowRight, CheckCircle, HandHeart, XCircle, ArrowLeft } from "lucide-react";
import { useEffect, useState, useRef } from "react"; // Import useRef
import Link from "next/link"; // Changed to Link from 'next/link' for Next.js routing
import axios from "@/lib/axios";
import Confetti from "react-confetti";
import { useCartStore } from "@/store/useCartStore";
import { motion } from "framer-motion"; // Import motion from framer-motion


const PurchaseResultPage = () => {
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState(null);
    // New state to track if cart has been loaded
    const [isCartLoaded, setIsCartLoaded] = useState(false);
    const [isPaymentSuccess, setIsPaymentSuccess] = useState(false); // New state to track payment success

    const { cart, getCartItems, clearCart } = useCartStore();

    // Use a ref to track if the API call has been made for this component instance
    // Refs persist across re-renders without causing re-renders themselves
    const hasApiCallBeenMade = useRef(false); 

    // Effect 1: Fetch cart items on component mount
    useEffect(() => {
        const fetchAndSetCartLoaded = async () => {
            try {
                // Ensure getCartItems actually updates the Zustand store's 'cart'
                await getCartItems();
                console.log("Cart items fetched by getCartItems. Setting isCartLoaded to true.");
                setIsCartLoaded(true); // Mark cart as loaded
            } catch (err) {
                console.error("Error fetching cart items:", err);
                setError("Failed to load cart information.");
                setIsProcessing(false);
            }
        };

        // We only want to fetch cart items once on mount
        fetchAndSetCartLoaded();
    }, [getCartItems]); // [ ] would also work, but we want to ensure getCartItems is always the latest version and to meet best practices

    // Effect 2: Handle success logic AFTER cart has been explicitly loaded
    useEffect(() => {
        // Only run if cart is loaded AND we are still processing AND the API call hasn't been made yet
        if (isCartLoaded && isProcessing && !hasApiCallBeenMade.current) {
            // Check if cart is actually populated after loading
            if (cart && cart.length > 0) {
                console.log("Proceeding with API call. Cart items:", cart);

                const handleSuccessApiCall = async () => {
                    // Mark that the API call has been initiated
                    hasApiCallBeenMade.current = true; 

                    const url = new URLSearchParams(window.location.search);
                    const orderId = url.get("order_id");
                    const couponCode = url.get("coupon") || null;

                    if (!orderId) {
                        setError("Order ID not found in URL. Cannot verify payment.");
                        setIsProcessing(false);
                        setIsPaymentSuccess(false);
                        return; // Exit early if no orderId
                    }
                    try {
                        const res = await axios.post("/payments/cashfree-success", {
                            orderId,
                            products: cart, // This 'cart' will now be the populated one
                            couponCode,
                        });

                        if (res.data.success) {
                            console.log("Payment verification successful!");
                            setIsPaymentSuccess(true); // Set payment success state
                            clearCart(); // Uncomment if you want to clear cart on successful purchase
                        } else {
                            setError("Payment verification failed");
                            console.error("Payment verification failed:", res.data.message);
                            setIsPaymentSuccess(false);
                        }
                    } catch (err) {
                        console.error("Cashfree success error:", err.message);
                        setError("Unexpected error while confirming payment.");
                        setIsPaymentSuccess(false)
                    } finally {
                        setIsProcessing(false);
                    }
                };

                handleSuccessApiCall();
            } else {
                // This means getCartItems completed, but the cart is empty
                console.warn("Cart is loaded but empty, skipping payment verification.");
                setError("No items found in cart to process payment."); // Inform user about empty cart
                setIsProcessing(false);
                setIsPaymentSuccess(false); // Treat as a failure for display purposes
            }
        }
    }, [isCartLoaded, cart, isProcessing]); 
	// isCartLoaded tells this useEffect to re-run only after the isCartLoaded state variable changes from false to true, signifying that getCartItems() has finished its work.
    // isProcessing ensures the effect runs when the processing state changes, allowing us to halt the API call if processing is no longer needed using ... if (isCartLoaded && isProcessing) {
	//  We also include cart because the axios.post call directly uses the cart data. If, in a more complex scenario, cart could change again after being initially loaded (e.g., if a user updated their cart items on a different tab, though less likely for a success page), this dependency would ensure the effect re-runs with the latest cart data.
	
    
    useEffect(() => {
        return () => {
            // Reset the ref if component unmounts to allow re-run if it remounts (e.g., dev hot reload)
            hasApiCallBeenMade.current = false; 
        };
    }, []);



    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-lg text-white">
                <p>Processing your payment...</p>
                <HandHeart className="w-16 h-16 animate-bounce mt-4 text-primary" />
            </div>
        );
    }


	if (error || !isPaymentSuccess) { // If there's an error OR payment was not successful
        return (
        <div className='min-h-screen flex items-center justify-center px-4'>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className='max-w-md w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden relative z-10'
			>
				<div className='p-6 sm:p-8'>
					<div className='flex justify-center'>
						<XCircle className='text-red-500 w-16 h-16 mb-4' />
					</div>
					<h1 className='text-2xl sm:text-3xl font-bold text-center text-red-500 mb-2'>Purchase Cancelled</h1>
					<p className='text-gray-300 text-center mb-6'>
						Your order has been cancelled. No charges have been made.
					</p>
					<div className='bg-gray-700 rounded-lg p-4 mb-6'>
						<p className='text-sm text-gray-400 text-center'>
							If you encountered any issues during the checkout process, please don&apos;t hesitate to
							contact our support team.
						</p>
					</div>
					<div className='space-y-4'>
						<Link
							href={"/"}
							className='w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center'
						>
							<ArrowLeft className='mr-2' size={18} />
							Return to Shop
						</Link>
					</div>
				</div>
			</motion.div>
		</div>
        );
    }

    // If payment was successful (isPaymentSuccess is true)
    return (
        <div className='h-screen flex items-center justify-center px-4'>
			<Confetti
				width={window.innerWidth}
				height={window.innerHeight}
				gravity={0.1}
				style={{ zIndex: 99 }}
				numberOfPieces={700}
				recycle={false}
			/>

			<div className='max-w-md w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden relative z-10'>
				<div className='p-6 sm:p-8'>
					<div className='flex justify-center'>
						<CheckCircle className='text-emerald-400 w-16 h-16 mb-4' />
					</div>
					<h1 className='text-2xl sm:text-3xl font-bold text-center text-emerald-400 mb-2'>
						Purchase Successful!
					</h1>

					<p className='text-gray-300 text-center mb-2'>
						Thank you for your order. {"We're"} processing it now.
					</p>
					<p className='text-emerald-400 text-center text-sm mb-6'>
						Check your email for order details and updates.
					</p>
					<div className='bg-gray-700 rounded-lg p-4 mb-6'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-sm text-gray-400'>Order number</span>
							<span className='text-sm font-semibold text-emerald-400'>#12345</span>
						</div>
						<div className='flex items-center justify-between'>
							<span className='text-sm text-gray-400'>Estimated delivery</span>
							<span className='text-sm font-semibold text-emerald-400'>3-5 business days</span>
						</div>
					</div>

					<div className='space-y-4'>
						<button
							className='w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4
             rounded-lg transition duration-300 flex items-center justify-center'
						>
							<HandHeart className='mr-2' size={18} />
							Thanks for trusting us!
						</button>
						<Link
							href={"/"}
							className='w-full bg-gray-700 hover:bg-gray-600 text-emerald-400 font-bold py-2 px-4 
            rounded-lg transition duration-300 flex items-center justify-center'
						>
							Continue Shopping
							<ArrowRight className='ml-2' size={18} />
						</Link>
					</div>
				</div>
			</div>
		</div>
    );
};

export default PurchaseResultPage;
