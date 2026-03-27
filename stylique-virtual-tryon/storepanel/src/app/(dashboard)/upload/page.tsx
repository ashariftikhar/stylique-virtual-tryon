'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2, AlertCircle, CheckCircle, Package } from 'lucide-react';

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
      // Get store session
      const sessionResponse = await fetch('/api/get-store-session');
      const sessionData = await sessionResponse.json();

      if (!sessionData.authenticated || !sessionData.store?.id) {
        setError('Not authenticated');
        return;
      }

      // Prepare product data
      const productData = {
        store_id: sessionData.store.id,
        product_name: productName,
        description,
        price: parseFloat(price) || 0,
        image_url: imageUrl,
        sizes: sizes,
      };

      // Submit to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload product');
      }

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
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
        },
      }}
    >
      {/* Header */}
      <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
        <h1 className="text-3xl font-bold text-white mb-2">Upload Product</h1>
        <p className="text-gray-400">Add a new item to your inventory</p>
      </motion.div>

      {/* Alert Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-300 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-green-900/20 border border-green-900/50 text-green-300 flex items-start gap-3"
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Product uploaded successfully!</p>
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Name */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <label className="block text-sm font-medium text-gray-300 mb-2">Product Name *</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Enter product name"
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] focus:border-transparent"
          />
        </motion.div>

        {/* Description */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter product description"
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] focus:border-transparent"
          />
        </motion.div>

        {/* Price */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Enter price"
            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] focus:border-transparent"
          />
        </motion.div>

        {/* Image URL */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <label className="block text-sm font-medium text-gray-300 mb-2">Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] focus:border-transparent"
          />
        </motion.div>

        {/* Sizes */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <label className="block text-sm font-medium text-gray-300 mb-3">Available Sizes</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                  sizes.includes(size)
                    ? 'bg-[#642FD7] text-white'
                    : 'bg-gray-800/50 text-gray-300 border border-gray-700 hover:border-[#642FD7]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.button
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          type="submit"
          disabled={isLoading || !productName}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-[#642FD7] to-[#F4536F] text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload Product
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
