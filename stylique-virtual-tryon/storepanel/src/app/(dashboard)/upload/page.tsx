'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function UploadItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);

  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const storeId = localStorage.getItem('store_id');
      if (!storeId) {
        setError('Store ID not found — please sign in again');
        return;
      }

      const productData = {
        store_id: storeId,
        product_name: productName,
        description,
        price: parseFloat(price) || 0,
        image_url: imageUrl,
        sizes,
      };

      // Use apiClient which includes Authorization header
      await (apiClient as any).request('/api/inventory', 'POST', productData);

      setSuccess(true);
      setProductName('');
      setDescription('');
      setPrice('');
      setImageUrl('');
      setSizes([]);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while uploading');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSize = (size: string) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  return (
    <motion.div
      className="max-w-2xl space-y-6"
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={fade}>
        <h1 className="text-3xl font-bold text-white mb-1">Upload Product</h1>
        <p className="text-gray-400 text-sm">Add a new item to your inventory</p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-300 flex items-start gap-3 text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-900/50 text-emerald-300 flex items-start gap-3 text-sm"
        >
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Product uploaded successfully!</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <motion.div variants={fade}>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Product Name *
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Enter product name"
            required
            className="w-full px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7]/50 focus:border-transparent"
          />
        </motion.div>

        <motion.div variants={fade}>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter product description"
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7]/50 focus:border-transparent resize-none"
          />
        </motion.div>

        <motion.div variants={fade}>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Price</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7]/50 focus:border-transparent"
          />
        </motion.div>

        <motion.div variants={fade}>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7]/50 focus:border-transparent"
          />
        </motion.div>

        <motion.div variants={fade}>
          <label className="block text-sm font-medium text-gray-300 mb-2">Available Sizes</label>
          <div className="grid grid-cols-4 gap-2">
            {sizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  sizes.includes(size)
                    ? 'bg-[#642FD7] text-white'
                    : 'bg-gray-900/50 text-gray-400 border border-gray-800 hover:border-[#642FD7]/40'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.button
          variants={fade}
          type="submit"
          disabled={isLoading || !productName}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-[#642FD7] to-[#F4536F] text-white font-medium text-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Product
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
