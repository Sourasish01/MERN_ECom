'use client';


import { useCartStore } from "@/store/useCartStore";
import { motion } from "framer-motion";
import EmptyCartUI from "@/components/EmptyCartUI";
import CartItem from "@/components/CartItem";
import PeopleAlsoBought from "@/components/PeopleAlsoBought";
import OrderSummary from "@/components/OrderSummary";
import GiftCouponCard from "@/components/GiftCouponCard";
import { useUserStore } from "@/store/useUserStore";
import { useRouter } from "next/navigation";
import { useEffect} from "react";

const CartPage = () => {
	const router = useRouter();
		
	const { user, checkingAuth } = useUserStore();

	useEffect(() => {
		// 1. **Crucial Step:** Wait for authentication check to complete.
		if (checkingAuth) { 
			return; // Exit the effect, do nothing yet.
		}

		// 2. Authentication check is done (checkingAuth is false). Now evaluate user status.
		if (!user  || !user._id) {
			router.push("/");
		}
	}, [user, checkingAuth, router]); // Dependency on checkingAuth

	const { cart } = useCartStore();
	/*const cart = [
		{
		_id: "1",
		title: "Product 1",
		price: 100,
		quantity: 1,
		},
		{
		_id: "2",
		title: "Product 2",
		price: 200,
		quantity: 2,
		},
	];
	*/

	return (
		<div className='py-8 md:py-16'>
			<div className='mx-auto max-w-screen-xl px-4 2xl:px-0'>
				<div className='mt-6 sm:mt-8 md:gap-6 lg:flex lg:items-start xl:gap-8'>
					<motion.div
						className='mx-auto w-full flex-none lg:max-w-2xl xl:max-w-4xl'
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
					>
						{cart?.length === 0 ? (
							<EmptyCartUI />
						) : (
							<div className='space-y-6'>
								{cart.map((item) => (
									<CartItem key={item._id} item={item} />
								))}
							</div>
						)}
						{cart?.length > 0 && <PeopleAlsoBought />}
					</motion.div>

					{cart?.length > 0 && (
						<motion.div
							className='mx-auto mt-6 max-w-4xl flex-1 space-y-6 lg:mt-0 lg:w-full'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.5, delay: 0.4 }}
						>
							<OrderSummary />
							<GiftCouponCard />
						</motion.div>
					)}
				</div>
			</div>
		</div>
	);
};
export default CartPage;

