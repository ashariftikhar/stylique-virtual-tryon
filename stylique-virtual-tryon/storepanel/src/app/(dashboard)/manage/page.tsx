'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Loader2, AlertCircle, Search, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { InventoryItem } from '@/types/api';

export default function ManageInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        setIsLoading(true);
        const sessionResponse = await fetch('/api/get-store-session');
        const sessionData = await sessionResponse.json();

        if (!sessionData.authenticated || !sessionData.store?.id) {
          setError('Not authenticated');
          return;
        }

        try {
          const data = await apiClient.getInventory(sessionData.store.id, 100);
          setInventory(data.inventory || []);
        } catch (apiError) {
          console.warn('Backend inventory endpoint not yet available');
          setInventory([]);
        }
      } catch (err) {
        console.error('Error loading inventory:', err);
        setError('Failed to load inventory');
      } finally {
        setIsLoading(false);
      }
    };

    loadInventory();
  }, []);

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await apiClient.updateInventory(productId, { deleted: true });
      setInventory((prev) => prev.filter((item) => item.id !== productId));
      setDeleteId(null);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete product');
    }
  };

  const filteredInventory = inventory.filter((item) =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#642FD7]" />
          <p className="text-white">Loading inventory...</p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-white mb-2">Manage Inventory</h1>
        <p className="text-gray-400">View and manage your products</p>
      </motion.div>

      {/* Search */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
        className="relative"
      >
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7]"
        />
      </motion.div>

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

      {/* Inventory List */}
      {filteredInventory.length === 0 ? (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 text-center"
        >
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            {inventory.length === 0 ? 'No products yet' : 'No products match your search'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="grid gap-4"
        >
          {filteredInventory.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-xl bg-gray-900/50 border border-gray-800 p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{item.product_name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-400 truncate">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        {item.price && (
                          <span className="text-gray-300">
                            Price: <span className="text-white font-medium">${item.price}</span>
                          </span>
                        )}
                        {item.sizes && item.sizes.length > 0 && (
                          <span className="text-gray-300">
                            Sizes: <span className="text-white font-medium">{item.sizes.join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 hover:bg-red-900/20 rounded-lg text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
