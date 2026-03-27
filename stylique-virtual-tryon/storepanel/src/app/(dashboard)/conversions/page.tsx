'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';

export default function Conversions() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
        },
      }}
    >
      {/* Header */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Conversion Analytics</h1>
        <p className="text-gray-400">Track customer conversions from try-ons</p>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#642FD7]" />
            <p className="text-white">Loading conversion data...</p>
          </div>
        </div>
      ) : (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 text-center"
        >
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Conversion tracking integration coming soon</p>
          <p className="text-sm text-gray-500 mt-2">Connect your sales data for detailed insights</p>
        </motion.div>
      )}
    </motion.div>
  );
}
