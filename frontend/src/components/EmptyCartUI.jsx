'use client'

import React, { use } from 'react'
import { motion } from "framer-motion";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";


const EmptyCartUI = () => {
  return (
    <motion.div
      className='flex flex-col items-center justify-center space-y-4 py-16'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ShoppingCart className='h-24 w-24 text-gray-300' />
      <h3 className='text-2xl font-semibold '>Your cart is empty</h3>
      <p className='text-gray-400'>Looks like you {"haven't"} added anything to your cart yet.</p>
      <Link
        className='mt-4 rounded-md bg-emerald-500 px-6 py-2 text-white transition-colors hover:bg-emerald-600'
        href='/'
      >
        Start Shopping
      </Link>
    </motion.div>
  )
}

export default EmptyCartUI