'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Info, PackagePlus, Sparkles, Upload } from 'lucide-react';
import { AlertBanner, Badge, Button, Card, Input, PageHeader, Textarea } from '@/components/ui';
import { apiClient } from '@/lib/api';
import { classNameMerge } from '@/lib/utils';

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

export default function UploadItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);

  const priceValue = useMemo(() => {
    const parsed = Number.parseFloat(price);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [price]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const storeId = localStorage.getItem('store_id');
      if (!storeId) {
        setError('Store ID not found. Please sign in again.');
        return;
      }

      if (imageUrl && !/^https?:\/\/.+/i.test(imageUrl)) {
        setError('Image URL must start with http:// or https://.');
        return;
      }

      await apiClient.createInventory({
        store_id: storeId,
        product_name: productName.trim(),
        description: description.trim(),
        price: priceValue,
        image_url: imageUrl.trim(),
        sizes,
      });

      setSuccess(true);
      setProductName('');
      setDescription('');
      setPrice('');
      setImageUrl('');
      setSizes([]);
      setTimeout(() => setSuccess(false), 4500);
    } catch (err: any) {
      setError(err.message || 'An error occurred while uploading.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSize = (size: string) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((item) => item !== size) : [...prev, size],
    );
  };

  return (
    <motion.div
      className="mx-auto max-w-6xl space-y-8"
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
    >
      <motion.div variants={fade}>
        <PageHeader
          eyebrow="Product Intake"
          title="Upload Product"
          description="Create a manual inventory item with clean details, sizing, and a preview image before sending it into Stylique."
        />
      </motion.div>

      {error && (
        <motion.div variants={fade}>
          <AlertBanner tone="danger" title="Upload failed">
            {error}
          </AlertBanner>
        </motion.div>
      )}

      {success && (
        <motion.div variants={fade}>
          <AlertBanner tone="success" title="Product uploaded">
            The item was added to inventory. Open Inventory to review the tier and try-on image.
          </AlertBanner>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <motion.div variants={fade} className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 border-b border-white/10 pb-5">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white">
                <PackagePlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Product details</h2>
                <p className="text-sm text-zinc-500">Keep names clear and images direct.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-300" htmlFor="productName">
                  Product Name
                </label>
                <Input
                  id="productName"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Premium linen blazer"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-300" htmlFor="description">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add useful product notes for internal review."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300" htmlFor="price">
                    Price
                  </label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300" htmlFor="imageUrl">
                    Image URL
                  </label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 border-b border-white/10 pb-5">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Available sizes</h2>
                <p className="text-sm text-zinc-500">Choose every size that should appear in recommendations.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={classNameMerge(
                    'h-11 rounded-lg border text-sm font-bold transition',
                    sizes.includes(size)
                      ? 'border-white bg-white text-black'
                      : 'border-white/10 bg-white/[0.035] text-zinc-500 hover:border-white/25 hover:text-white',
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </Card>

          <AlertBanner tone="info" title="Manual upload note">
            Products added here stay inside Stylique inventory. Live Shopify or WooCommerce catalog changes should still be created in the store platform so sync remains accurate.
          </AlertBanner>
        </motion.div>

        <motion.aside variants={fade} className="space-y-6">
          <Card className="sticky top-28">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge variant="teal">Preview</Badge>
                <h2 className="mt-3 text-lg font-black text-white">Intake card</h2>
              </div>
              <Badge variant={productName ? 'success' : 'muted'}>{productName ? 'Ready' : 'Draft'}</Badge>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-black/35">
              {imageUrl ? (
                <div
                  className="h-72 bg-cover bg-center"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                  aria-label="Product image preview"
                />
              ) : (
                <div className="grid h-72 place-items-center text-zinc-600">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-10 w-10" />
                    <p className="mt-3 text-sm">Image preview</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">Product</p>
                <p className="mt-1 truncate text-lg font-black text-white">{productName || 'Untitled product'}</p>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                <span className="text-zinc-500">Price</span>
                <span className="font-bold text-white">${priceValue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                <span className="text-zinc-500">Sizes</span>
                <span className="font-bold text-white">{sizes.length ? sizes.join(', ') : 'None selected'}</span>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              isLoading={isLoading}
              disabled={!productName.trim()}
            >
              {isLoading ? (
                'Uploading'
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Product
                </>
              )}
            </Button>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
              <p className="text-xs leading-5 text-zinc-500">
                After upload, run image processing or set a manual tier from Inventory.
              </p>
            </div>
          </Card>
        </motion.aside>
      </form>
    </motion.div>
  );
}
