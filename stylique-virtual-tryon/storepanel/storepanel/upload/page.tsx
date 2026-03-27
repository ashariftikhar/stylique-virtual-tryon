'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CategorySelect from '@/components/CategorySelect';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Image as ImageIcon,
  Package,
  Tag,
  DollarSign,
  FileText
} from 'lucide-react';
import Image from 'next/image';
import { SizeMeasurements } from '@/types/store';
import { motion } from 'framer-motion';

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

export default function UploadItem() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 3D Tryon Images
  const [selectedFront3D, setSelectedFront3D] = useState<File | null>(null);
  const [previewFront3D, setPreviewFront3D] = useState<string | null>(null);
  const [selectedBack3D, setSelectedBack3D] = useState<File | null>(null);
  const [previewBack3D, setPreviewBack3D] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeMeasurements, setSizeMeasurements] = useState<Record<string, {
    width: string;
    height: string;
    waist: string;
    shoulder: string;
    chest: string;
    length: string;
    sleeve: string;
    inseam: string;
  }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const front3DInputRef = useRef<HTMLInputElement>(null);
  const back3DInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    category: '',
    brand: '',
    price: '',
    product_link: '',
    colour: '',
    fabric_type: 'MEDIUM_STRETCH',
    season: 'ALL_SEASON',
    activity: 'CASUAL',
    occasion: 'WEEKEND_CASUAL',
    gender: 'UNISEX'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Prevent negative price and strip non-numeric chars gracefully
    if (name === 'price') {
      const v = value.trim();
      if (v === '') {
        setFormData(prev => ({ ...prev, price: '' }));
      } else {
        const n = Number(v);
        const safe = Number.isFinite(n) ? Math.max(0, n) : '';
        setFormData(prev => ({ ...prev, price: safe === '' ? '' : String(safe) }));
      }
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSizeMeasurementChange = (size: string, field: string, value: string) => {
    setSizeMeasurements(prev => ({
      ...prev,
      [size]: {
        ...prev[size],
        [field]: value
      }
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'front3d' | 'back3d') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (type === 'main') {
          setSelectedImage(file);
          setImagePreview(result);
        } else if (type === 'front3d') {
          setSelectedFront3D(file);
          setPreviewFront3D(result);
        } else if (type === 'back3d') {
          setSelectedBack3D(file);
          setPreviewBack3D(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev => {
      const newSizes = prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size];

      // Initialize measurements for new sizes
      if (!prev.includes(size)) {
        setSizeMeasurements(prevMeasurements => ({
          ...prevMeasurements,
          [size]: {
            width: '',
            height: '',
            waist: '',
            shoulder: '',
            chest: '',
            length: '',
            sleeve: '',
            inseam: ''
          }
        }));
      }

      return newSizes;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!selectedImage) {
        setError('Please select an image');
        return;
      }

      if (selectedSizes.length === 0) {
        setError('Please select at least one size');
        return;
      }

      // Get store session from cookie or API
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      let storeSession;

      // Try to get from cookie first
      const storeSessionCookie = getCookie('store_session');
      if (storeSessionCookie) {
        try {
          storeSession = JSON.parse(storeSessionCookie);
        } catch {
          console.log('Failed to parse cookie, trying API...');
        }
      }

      // Normalize ID
      const storeId = storeSession?.id || storeSession?.store_uuid;

      if (!storeSession || !storeId) {
        console.log('Getting session from API...');
        const response = await fetch('/api/get-store-session');
        const result = await response.json();

        if (!result.authenticated) {
          setError('Not authenticated');
          return;
        }

        storeSession = result.store;
      }

      // Re-normalize ID after potentially fetching new session
      const finalStoreId = storeSession?.id || storeSession?.store_uuid;

      if (!storeSession || !finalStoreId) {
        setError('Not authenticated');
        return;
      }

      // Upload image to storage
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      console.log('Uploading image:', { fileName, fileSize: selectedImage.size, fileType: selectedImage.type });

      const { error: uploadError } = await supabase.storage
        .from('inventory')
        .upload(fileName, selectedImage);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError(`Failed to upload image: ${uploadError.message}`);
        return;
      }

      console.log('Image uploaded successfully');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('inventory')
        .getPublicUrl(fileName);

      // Upload 3D Front Image if selected
      let front3DPublicUrl = null;
      if (selectedFront3D) {
        const frontExt = selectedFront3D.name.split('.').pop();
        const frontName = `${Date.now()}_3d_front.${frontExt}`;

        const { error: frontError } = await supabase.storage
          .from('inventory')
          .upload(frontName, selectedFront3D);

        if (frontError) {
          setError(`Failed to upload 3D front image: ${frontError.message}`);
          return;
        }

        const { data } = supabase.storage.from('inventory').getPublicUrl(frontName);
        front3DPublicUrl = data.publicUrl;
      }

      // Upload 3D Back Image if selected
      let back3DPublicUrl = null;
      if (selectedBack3D) {
        const backExt = selectedBack3D.name.split('.').pop();
        const backName = `${Date.now()}_3d_back.${backExt}`;

        const { error: backError } = await supabase.storage
          .from('inventory')
          .upload(backName, selectedBack3D);

        if (backError) {
          setError(`Failed to upload 3D back image: ${backError.message}`);
          return;
        }

        const { data } = supabase.storage.from('inventory').getPublicUrl(backName);
        back3DPublicUrl = data.publicUrl;
      }

      // Create sizes object with measurements for each size
      const sizesWithMeasurements = selectedSizes.reduce((acc, size) => {
        const measurements = sizeMeasurements[size];
        acc[size] = {
          available: true,
          measurements: {
            width: measurements.width ? parseFloat(measurements.width) : undefined,
            height: measurements.height ? parseFloat(measurements.height) : undefined,
            waist: measurements.waist ? parseFloat(measurements.waist) : undefined,
            shoulder: measurements.shoulder ? parseFloat(measurements.shoulder) : undefined,
            chest: measurements.chest ? parseFloat(measurements.chest) : undefined,
            length: measurements.length ? parseFloat(measurements.length) : undefined,
            sleeve: measurements.sleeve ? parseFloat(measurements.sleeve) : undefined,
            inseam: measurements.inseam ? parseFloat(measurements.inseam) : undefined,
          }
        };
        return acc;
      }, {} as Record<string, { available: boolean; measurements?: SizeMeasurements }>);

      // Add unavailable sizes as false
      sizeOptions.forEach(size => {
        if (!sizesWithMeasurements[size]) {
          sizesWithMeasurements[size] = { available: false };
        }
      });

      // Insert into database
      console.log('Inserting into database:', {
        store_id: finalStoreId,
        product_name: formData.product_name,
        image_url: publicUrl,
        sizes: sizesWithMeasurements
      });

      const { error: insertError } = await supabase
        .from('inventory')
        .insert({
          store_id: finalStoreId,
          product_name: formData.product_name,
          description: formData.description || null,
          category: formData.category || null,
          brand: formData.brand || null,
          price: formData.price ? Math.max(0, parseFloat(formData.price)) : null,
          image_url: publicUrl,
          '3d_front_image': front3DPublicUrl,
          '3d_back_image': back3DPublicUrl,
          product_link: formData.product_link || null,
          colour: formData.colour || null,
          fabric_type: formData.fabric_type,
          season: formData.season,
          activity: formData.activity,
          occasion: formData.occasion,
          gender: formData.gender,
          sizes: sizesWithMeasurements
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        setError(`Failed to save item: ${insertError.message}`);
        return;
      }

      console.log('Item saved successfully');

      setSuccess(true);
      setTimeout(() => {
        router.push('/storepanel/manage');
      }, 2000);

    } catch {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      description: '',
      category: '',
      brand: '',
      price: '',
      product_link: '',
      colour: '',
      fabric_type: 'MEDIUM_STRETCH',
      season: 'ALL_SEASON',
      activity: 'CASUAL',
      occasion: 'WEEKEND_CASUAL',
      gender: 'UNISEX'
    });
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedFront3D(null);
    setPreviewFront3D(null);
    setSelectedBack3D(null);
    setPreviewBack3D(null);
    setSelectedSizes([]);
    setSizeMeasurements({});
    setError('');
    setSuccess(false);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <div className="border-0 shadow-xl bg-[#2a2a2a] rounded-2xl p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#642FD7] to-[#F4536F] shadow-lg">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-3"
              style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
            >
              Item Uploaded Successfully!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-lg"
              style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
            >
              Your item has been added to the inventory. Redirecting to manage items...
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-6"
      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
          Upload New Item
        </h1>
        <p className="text-gray-400 text-sm sm:text-base lg:text-lg px-2 sm:px-0">
          Add clothing items to your inventory with detailed specifications
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="border-0 shadow-lg bg-[#2a2a2a] rounded-2xl">
            <div className="bg-gradient-to-r from-[#642FD7]/20 to-[#F4536F]/20 rounded-t-2xl p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg lg:text-xl text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                <div className="p-1.5 sm:p-2 bg-gradient-to-r from-[#642FD7] to-[#F4536F] rounded-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                Basic Information
              </div>
              <p className="text-sm sm:text-base text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                Essential details about the product
              </p>
            </div>
            <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Product Name *
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleInputChange}
                      placeholder="e.g., Classic White T-Shirt"
                      required
                      className="pl-10 h-11 sm:h-12 bg-gray-900 border-gray-700 text-white focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                    />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Brand
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder="e.g., Nike, Adidas"
                      className="pl-10 h-11 sm:h-12 bg-gray-900 border-gray-700 text-white focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                    />
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                  Product Website Link
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 sm:top-3 transform sm:transform-none -translate-y-1/2 sm:translate-y-0 h-4 w-4 text-gray-400" />
                  <Input
                    name="product_link"
                    type="url"
                    value={formData.product_link}
                    onChange={handleInputChange}
                    placeholder="https://example.com/product-page"
                    className="pl-10 h-11 sm:h-12 bg-gray-900 border-gray-700 text-white focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                  Optional: Link to your product page for customer redirection
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                  Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the product, materials, features..."
                    rows={3}
                    className="pl-10 bg-gray-900 border-gray-700 text-white focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                  />
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Category
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <div className="pl-8">
                      <CategorySelect
                        name="category"
                        value={formData.category}
                        onChange={(val) => setFormData((prev) => ({ ...prev, category: val }))}
                        placeholder="Select a category"
                        className="h-12"
                      />
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Price (PKR)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      name="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="2999"
                      className="pl-10 h-11 sm:h-12 bg-gray-900 border-gray-700 text-white focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                    />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.85 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Colour
                  </label>
                  <div className="relative">
                    <Input
                      name="colour"
                      value={formData.colour}
                      onChange={handleInputChange}
                      placeholder="e.g., Red, Blue, Black"
                      className="h-11 sm:h-12 bg-gray-900 border-gray-700 text-white focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Product Attributes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="border-0 shadow-lg bg-[#2a2a2a] rounded-2xl">
            <div className="bg-gradient-to-r from-[#642FD7]/20 to-[#F4536F]/20 rounded-t-2xl p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg lg:text-xl text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                <div className="p-1.5 sm:p-2 bg-gradient-to-r from-[#642FD7] to-[#F4536F] rounded-lg">
                  <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                Product Attributes
              </div>
              <p className="text-sm sm:text-base text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                Additional details for better size recommendations
              </p>
            </div>
            <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Fabric Type
                  </label>
                  <div className="relative">
                    <select
                      name="fabric_type"
                      value={formData.fabric_type}
                      onChange={handleInputChange}
                      className="w-full h-11 sm:h-12 px-3 bg-gray-900 border border-gray-700 text-white rounded-md focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                    >
                      <option value="RIGID">Rigid (No Stretch)</option>
                      <option value="MEDIUM_STRETCH">Medium Stretch</option>
                      <option value="HIGH_STRETCH">High Stretch</option>
                    </select>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Season
                  </label>
                  <div className="relative">
                    <select
                      name="season"
                      value={formData.season}
                      onChange={handleInputChange}
                      className="w-full h-11 sm:h-12 px-3 bg-gray-900 border border-gray-700 text-white rounded-md focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                    >
                      <option value="SUMMER">Summer</option>
                      <option value="WINTER">Winter</option>
                      <option value="SPRING">Spring</option>
                      <option value="FALL">Fall</option>
                      <option value="ALL_SEASON">All Season</option>
                    </select>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Activity Type
                  </label>
                  <div className="relative">
                    <select
                      name="activity"
                      value={formData.activity}
                      onChange={handleInputChange}
                      className="w-full h-11 sm:h-12 px-3 bg-gray-900 border border-gray-700 text-white rounded-md focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                    >
                      <option value="CASUAL">Casual</option>
                      <option value="ATHLETIC">Athletic</option>
                      <option value="FORMAL">Formal</option>
                      <option value="BUSINESS">Business</option>
                    </select>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Occasion
                  </label>
                  <div className="relative">
                    <select
                      name="occasion"
                      value={formData.occasion}
                      onChange={handleInputChange}
                      className="w-full h-11 sm:h-12 px-3 bg-gray-900 border border-gray-700 text-white rounded-md focus:border-[#642FD7] focus:ring-[#642FD7] text-base md:text-sm"
                    >
                      <option value="WEEKEND_CASUAL">Weekend Casual</option>
                      <option value="BUSINESS_MEETING">Business Meeting</option>
                      <option value="PARTY">Party</option>
                      <option value="WORKOUT">Workout</option>
                      <option value="FORMAL_EVENT">Formal Event</option>
                    </select>
                  </div>
                </motion.div>
              </div>

              {/* Gender Selection - Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Gender *
                </label>
                <div className="relative">
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full h-12 px-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="MEN">Men&apos;s Clothing</option>
                    <option value="WOMEN">Women&apos;s Clothing</option>
                    <option value="UNISEX">Unisex (Both Men & Women)</option>
                    <option value="KIDS">Kids Clothing</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                  Select the primary gender this item is designed for
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* 2D Image Upload */}
        <div className="bg-[#2a2a2a] rounded-2xl p-4 sm:p-5 lg:p-6">
          <div className="mb-3 sm:mb-4">
            <div className="text-base sm:text-lg font-medium text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Single Front Side Image for 2D Tryon</div>
            <p className="text-xs sm:text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Upload a clear image of the clothing item
            </p>
          </div>
          <div>
            <div className="space-y-3 sm:space-y-4">
              {imagePreview ? (
                <div className="relative">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={400}
                    height={256}
                    className="w-full max-w-md h-48 sm:h-56 lg:h-64 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-gray-600 transition-colors bg-gray-900/50"
                >
                  <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-300" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Click to upload product image
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    PNG, JPG up to 10MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e, 'main')}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* 3D Images Upload */}
        <div className="bg-[#2a2a2a] rounded-2xl p-4 sm:p-5 lg:p-6">
          <div className="mb-3 sm:mb-4">
            <div className="text-base sm:text-lg font-medium text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Images for 3D Tryon</div>
            <p className="text-xs sm:text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Upload front and back images for 3D generation (Optional)
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Front Image */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Front Image</label>
              {previewFront3D ? (
                <div className="relative">
                  <Image
                    src={previewFront3D}
                    alt="Front Preview"
                    width={200}
                    height={200}
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFront3D(null);
                      setPreviewFront3D(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => front3DInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-gray-600 transition-colors bg-gray-900/50 h-48 flex flex-col items-center justify-center"
                >
                  <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-300">Front View</p>
                </div>
              )}
              <input
                ref={front3DInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e, 'front3d')}
                className="hidden"
              />
            </div>

            {/* Back Image */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Back Image</label>
              {previewBack3D ? (
                <div className="relative">
                  <Image
                    src={previewBack3D}
                    alt="Back Preview"
                    width={200}
                    height={200}
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBack3D(null);
                      setPreviewBack3D(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => back3DInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-gray-600 transition-colors bg-gray-900/50 h-48 flex flex-col items-center justify-center"
                >
                  <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-300">Back View</p>
                </div>
              )}
              <input
                ref={back3DInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e, 'back3d')}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Sizes */}
        <div className="bg-[#2a2a2a] rounded-2xl p-4 sm:p-5 lg:p-6">
          <div className="mb-3 sm:mb-4">
            <div className="text-base sm:text-lg font-medium text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Available Sizes</div>
            <p className="text-xs sm:text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Select the sizes available for this item
            </p>
          </div>
          <div>
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {sizeOptions.map((size) => (
                <Badge
                  key={size}
                  variant={selectedSizes.includes(size) ? "default" : "outline"}
                  className="cursor-pointer px-2.5 sm:px-3 py-1 text-sm sm:text-base"
                  onClick={() => handleSizeToggle(size)}
                >
                  {size}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Size-specific Measurements */}
        {selectedSizes.length > 0 && (
          <div className="bg-[#2a2a2a] rounded-2xl p-4 sm:p-5 lg:p-6">
            <div className="mb-3 sm:mb-4">
              <div className="text-base sm:text-lg font-medium text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Size-specific Measurements (Optional)</div>
              <p className="text-xs sm:text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                Add detailed measurements for each selected size in inches
              </p>
            </div>
            <div>
              <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                {selectedSizes.map((size) => (
                  <div key={size} className="border border-gray-700 rounded-lg p-3 sm:p-4">
                    <h4 className="font-medium text-white mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                      <Badge variant="default" className="bg-gradient-to-r from-[#642FD7] to-[#F4536F] text-xs sm:text-sm">{size}</Badge>
                      Size Measurements
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          Width
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={sizeMeasurements[size]?.width || ''}
                          onChange={(e) => handleSizeMeasurementChange(size, 'width', e.target.value)}
                          placeholder="20.5"
                          className="bg-gray-900 border-gray-700 text-white text-base md:text-sm h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          Height
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={sizeMeasurements[size]?.height || ''}
                          onChange={(e) => handleSizeMeasurementChange(size, 'height', e.target.value)}
                          placeholder="28.0"
                          className="bg-gray-900 border-gray-700 text-white text-base md:text-sm h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          Waist
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={sizeMeasurements[size]?.waist || ''}
                          onChange={(e) => handleSizeMeasurementChange(size, 'waist', e.target.value)}
                          placeholder="32.0"
                          className="bg-gray-900 border-gray-700 text-white text-base md:text-sm h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          Shoulder
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={sizeMeasurements[size]?.shoulder || ''}
                          onChange={(e) => handleSizeMeasurementChange(size, 'shoulder', e.target.value)}
                          placeholder="16.5"
                          className="bg-gray-900 border-gray-700 text-white text-base md:text-sm h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          Chest
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={sizeMeasurements[size]?.chest || ''}
                          onChange={(e) => handleSizeMeasurementChange(size, 'chest', e.target.value)}
                          placeholder="40.0"
                          className="bg-gray-900 border-gray-700 text-white text-base md:text-sm h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          Length
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={sizeMeasurements[size]?.length || ''}
                          onChange={(e) => handleSizeMeasurementChange(size, 'length', e.target.value)}
                          placeholder="26.0"
                          className="bg-gray-900 border-gray-700 text-white text-base md:text-sm h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          Sleeve
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={sizeMeasurements[size]?.sleeve || ''}
                          onChange={(e) => handleSizeMeasurementChange(size, 'sleeve', e.target.value)}
                          placeholder="8.5"
                          className="bg-gray-900 border-gray-700 text-white text-base md:text-sm h-10 sm:h-11"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          Inseam
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={sizeMeasurements[size]?.inseam || ''}
                          onChange={(e) => handleSizeMeasurementChange(size, 'inseam', e.target.value)}
                          placeholder="32.0"
                          className="bg-gray-900 border-gray-700 text-white text-base md:text-sm h-10 sm:h-11"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-800" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 w-full sm:w-auto text-sm sm:text-base h-11 sm:h-10 bg-gradient-to-r from-[#642FD7] to-[#F4536F] hover:from-[#642FD7]/90 hover:to-[#F4536F]/90 text-white border-0"
            style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Uploading...</span>
                <span className="sm:hidden">Uploading</span>
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Upload Item</span>
                <span className="sm:hidden">Upload</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={isLoading}
            className="w-full sm:w-auto text-sm sm:text-base h-11 sm:h-10"
          >
            Reset
          </Button>
        </div>
      </form>
    </motion.div>
  );
} 