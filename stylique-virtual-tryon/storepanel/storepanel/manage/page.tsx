"use client";

import { useState, useEffect, useCallback } from "react";
import { formatPKR } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Edit,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { InventoryItem, SizeMeasurements } from "@/types/store";
import Image from "next/image";
import CategorySelect from "@/components/CategorySelect";
import { useStorePanel } from "@/contexts/StorePanelContext";

export default function ManageItems() {
  const { searchQuery, setSearchQuery } = useStorePanel();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingSizes, setEditingSizes] = useState<
    Record<string, { available: boolean; measurements?: SizeMeasurements }>
  >({});

  // Image Upload States for Edit
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [newFront3D, setNewFront3D] = useState<File | null>(null);
  const [newFront3DPreview, setNewFront3DPreview] = useState<string | null>(
    null,
  );
  const [newBack3D, setNewBack3D] = useState<File | null>(null);
  const [newBack3DPreview, setNewBack3DPreview] = useState<string | null>(null);

  const sizeOptions = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

  const handleSizeToggle = (size: string) => {
    setEditingSizes((prev) => {
      const newSizes = { ...prev };
      if (newSizes[size]) {
        delete newSizes[size];
      } else {
        newSizes[size] = {
          available: true,
          measurements: {
            width: undefined,
            height: undefined,
            waist: undefined,
            shoulder: undefined,
            chest: undefined,
            length: undefined,
            sleeve: undefined,
            inseam: undefined,
          },
        };
      }
      return newSizes;
    });
  };

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "main" | "front3d" | "back3d",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (type === "main") {
          setNewImage(file);
          setNewImagePreview(result);
        } else if (type === "front3d") {
          setNewFront3D(file);
          setNewFront3DPreview(result);
        } else if (type === "back3d") {
          setNewBack3D(file);
          setNewBack3DPreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSizeMeasurementChange = (
    size: string,
    field: string,
    value: string,
  ) => {
    setEditingSizes((prev) => ({
      ...prev,
      [size]: {
        ...prev[size],
        measurements: {
          ...prev[size]?.measurements,
          [field]: value ? parseFloat(value) : undefined,
        },
      },
    }));
  };

  const loadItems = useCallback(async () => {
    try {
      // Get store session from cookie or API
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return null;
      };

      let storeSession;

      // Try to get from cookie first
      const storeSessionCookie = getCookie("store_session");
      if (storeSessionCookie) {
        try {
          storeSession = JSON.parse(storeSessionCookie);
        } catch {
          console.log("Failed to parse cookie, trying API...");
        }
      }

      // If cookie failed, try API
      if (!storeSession || !storeSession.store_uuid) {
        console.log("Getting session from API...");
        const response = await fetch("/api/get-store-session");
        const result = await response.json();

        if (!result.authenticated) {
          setError("Not authenticated");
          return;
        }

        storeSession = result.store;
      }

      // Normalize ID
      const storeId = storeSession?.id || storeSession?.store_uuid;

      if (!storeSession || !storeId) {
        setError("Not authenticated");
        return;
      }

      console.log("Loading items for store:", storeId);

      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Loaded items:", data);
      setItems(data || []);
    } catch (error) {
      console.error("Load items error:", error);
      setError("Failed to load items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sync local field with global topbar search
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setItems(items.filter((item) => item.id !== itemId));
      setSuccess("Item deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to delete item");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsUpdating(true);
    setError("");

    try {
      // Add unavailable sizes as false
      const allSizes = { ...editingSizes };
      sizeOptions.forEach((size) => {
        if (!allSizes[size]) {
          allSizes[size] = { available: false };
        }
      });

      // Upload new images if selected
      let mainImageUrl = editingItem.image_url;
      let front3DUrl = editingItem["3d_front_image"];
      let back3DUrl = editingItem["3d_back_image"];

      if (newImage) {
        const fileExt = newImage.name.split(".").pop();
        const fileName = `${Date.now()}_main.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("inventory")
          .upload(fileName, newImage);
        if (uploadError)
          throw new Error(`Main image upload failed: ${uploadError.message}`);
        const { data } = supabase.storage
          .from("inventory")
          .getPublicUrl(fileName);
        mainImageUrl = data.publicUrl;
      }

      if (newFront3D) {
        const fileExt = newFront3D.name.split(".").pop();
        const fileName = `${Date.now()}_3d_front.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("inventory")
          .upload(fileName, newFront3D);
        if (uploadError)
          throw new Error(
            `Front 3D image upload failed: ${uploadError.message}`,
          );
        const { data } = supabase.storage
          .from("inventory")
          .getPublicUrl(fileName);
        front3DUrl = data.publicUrl;
      }

      if (newBack3D) {
        const fileExt = newBack3D.name.split(".").pop();
        const fileName = `${Date.now()}_3d_back.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("inventory")
          .upload(fileName, newBack3D);
        if (uploadError)
          throw new Error(
            `Back 3D image upload failed: ${uploadError.message}`,
          );
        const { data } = supabase.storage
          .from("inventory")
          .getPublicUrl(fileName);
        back3DUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("inventory")
        .update({
          product_name: editingItem.product_name,
          description: editingItem.description,
          category: editingItem.category,
          brand: editingItem.brand,
          price: editingItem.price,
          product_link: editingItem.product_link,
          colour: editingItem.colour,
          fabric_type: editingItem.fabric_type,
          season: editingItem.season,
          activity: editingItem.activity,
          occasion: editingItem.occasion,
          image_url: mainImageUrl,
          "3d_front_image": front3DUrl,
          "3d_back_image": back3DUrl,
          sizes: allSizes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      // Create the updated item with all the new data
      const updatedItem: InventoryItem = {
        ...editingItem,
        image_url: mainImageUrl,
        "3d_front_image": front3DUrl,
        "3d_back_image": back3DUrl,
        sizes: allSizes,
        updated_at: new Date().toISOString(),
      };

      setItems(
        items.map((item) => (item.id === editingItem.id ? updatedItem : item)),
      );
      setEditingItem(null);
      setSuccess("Item updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to update item");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = (searchTerm || "").toLowerCase().trim();
    const matchesSearch =
      item.product_name.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.product_link?.toLowerCase().includes(q) ||
      item.colour?.toLowerCase().includes(q);
    const matchesCategory = !filterCategory || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // categories are centralized in CategorySelect

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "PPValve ExtraLight, sans-serif", fontWeight: 200 }}
    >
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-white">
          Manage Inventory
        </h1>
        <p className="text-gray-400 mt-2">
          View, edit, and delete items in your inventory
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-[#2a2a2a] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, brand, category, or link..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                className="pl-10 bg-gray-900 border-gray-700 text-white text-base md:text-sm"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <CategorySelect
              value={filterCategory}
              onChange={(v) => setFilterCategory(v)}
              placeholder="All Categories"
              className=""
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-800"
          style={{
            fontFamily: "PPValve ExtraLight, sans-serif",
            fontWeight: 200,
          }}
        >
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div
          className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 p-3 rounded-lg border border-green-800"
          style={{
            fontFamily: "PPValve ExtraLight, sans-serif",
            fontWeight: 200,
          }}
        >
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-[#2a2a2a] rounded-2xl p-6">
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3
              className="text-lg font-medium text-white mb-2"
              style={{
                fontFamily: "PPValve ExtraLight, sans-serif",
                fontWeight: 200,
              }}
            >
              No items found
            </h3>
            <p
              className="text-gray-400"
              style={{
                fontFamily: "PPValve ExtraLight, sans-serif",
                fontWeight: 200,
              }}
            >
              {items.length === 0
                ? "You haven't added any items yet. Start by uploading your first product."
                : "No items match your search criteria."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden bg-[#2a2a2a] rounded-2xl"
            >
              <div className="aspect-square overflow-hidden">
                <Image
                  src={item.image_url}
                  alt={item.product_name}
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3
                      className="font-semibold text-white truncate"
                      style={{
                        fontFamily: "PPValve ExtraLight, sans-serif",
                        fontWeight: 200,
                      }}
                    >
                      {item.product_name}
                    </h3>
                    {item.brand && (
                      <p
                        className="text-sm text-gray-400"
                        style={{
                          fontFamily: "PPValve ExtraLight, sans-serif",
                          fontWeight: 200,
                        }}
                      >
                        {item.brand}
                      </p>
                    )}
                    {item.gender && (
                      <div className="flex items-center gap-1 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${item.gender === "MEN"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : item.gender === "WOMEN"
                                ? "bg-pink-50 text-pink-700 border-pink-200"
                                : item.gender === "KIDS"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                        >
                          {item.gender === "MEN"
                            ? "👨 Men&apos;s"
                            : item.gender === "WOMEN"
                              ? "👩 Women&apos;s"
                              : item.gender === "KIDS"
                                ? "👶 Kids"
                                : "👥 Unisex"}
                        </Badge>
                      </div>
                    )}
                    {item.product_link && (
                      <div className="flex items-center gap-1 mt-1">
                        <a
                          href={item.product_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Product
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {typeof item.price === "number" && item.price >= 0 && (
                      <span
                        className="font-semibold text-green-400"
                        style={{
                          fontFamily: "PPValve ExtraLight, sans-serif",
                          fontWeight: 200,
                        }}
                      >
                        {formatPKR(item.price)}
                      </span>
                    )}
                    {item.category && (
                      <Badge
                        variant="outline"
                        className="text-xs border-gray-700 text-gray-300"
                      >
                        {item.category}
                      </Badge>
                    )}
                  </div>

                  {item.colour && (
                    <div
                      className="flex items-center gap-2 text-xs text-gray-400"
                      style={{
                        fontFamily: "PPValve ExtraLight, sans-serif",
                        fontWeight: 200,
                      }}
                    >
                      <span
                        className="inline-block w-3 h-3 rounded-full border"
                        style={{
                          backgroundColor: (item.colour || "").toLowerCase(),
                        }}
                      />
                      <span>{item.colour}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {Object.entries(item.sizes).map(
                      ([size, sizeData]) =>
                        sizeData?.available && (
                          <Badge
                            key={size}
                            variant="secondary"
                            className="text-xs"
                          >
                            {size}
                          </Badge>
                        ),
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingItem(item);
                        setEditingSizes(item.sizes);
                        setNewImage(null);
                        setNewImagePreview(null);
                        setNewFront3D(null);
                        setNewFront3DPreview(null);
                        setNewBack3D(null);
                        setNewBack3DPreview(null);
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#2a2a2a] rounded-2xl">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div
                  className="text-xl font-medium text-white"
                  style={{
                    fontFamily: "PPValve ExtraLight, sans-serif",
                    fontWeight: 200,
                  }}
                >
                  Edit Item
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingItem(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdate} className="space-y-4">
                {/* Image Management Section */}
                <div className="bg-gray-900/50 p-4 rounded-lg mb-6">
                  <h4
                    className="text-sm font-medium text-gray-300 mb-4"
                    style={{
                      fontFamily: "PPValve ExtraLight, sans-serif",
                      fontWeight: 200,
                    }}
                  >
                    Product Images
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Main Image */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">
                        Main Image (2D)
                      </label>
                      <div className="relative group">
                        <div className="relative h-32 w-full rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                          <Image
                            src={newImagePreview || editingItem.image_url}
                            alt="Main"
                            fill
                            className="object-cover"
                          />
                          <div
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() =>
                              document
                                .getElementById("edit-main-image")
                                ?.click()
                            }
                          >
                            <ImageIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <input
                          id="edit-main-image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(e, "main")}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Front 3D */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">
                        3D Front (Optional)
                      </label>
                      <div className="relative group">
                        <div className="relative h-32 w-full rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                          {newFront3DPreview ||
                            editingItem["3d_front_image"] ? (
                            <Image
                              src={
                                newFront3DPreview ||
                                editingItem["3d_front_image"]!
                              }
                              alt="Front 3D"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-500">
                              <span className="text-xs">No image</span>
                            </div>
                          )}
                          <div
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() =>
                              document.getElementById("edit-front-3d")?.click()
                            }
                          >
                            <ImageIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <input
                          id="edit-front-3d"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(e, "front3d")}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Back 3D */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">
                        3D Back (Optional)
                      </label>
                      <div className="relative group">
                        <div className="relative h-32 w-full rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                          {newBack3DPreview || editingItem["3d_back_image"] ? (
                            <Image
                              src={
                                newBack3DPreview ||
                                editingItem["3d_back_image"]!
                              }
                              alt="Back 3D"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-500">
                              <span className="text-xs">No image</span>
                            </div>
                          )}
                          <div
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() =>
                              document.getElementById("edit-back-3d")?.click()
                            }
                          >
                            <ImageIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <input
                          id="edit-back-3d"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(e, "back3d")}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-300 mb-1"
                      style={{
                        fontFamily: "PPValve ExtraLight, sans-serif",
                        fontWeight: 200,
                      }}
                    >
                      Product Name
                    </label>
                    <Input
                      value={editingItem.product_name}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          product_name: e.target.value,
                        })
                      }
                      required
                      className="bg-gray-900 border-gray-700 text-white text-base md:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-300 mb-1"
                      style={{
                        fontFamily: "PPValve ExtraLight, sans-serif",
                        fontWeight: 200,
                      }}
                    >
                      Brand
                    </label>
                    <Input
                      value={editingItem.brand || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          brand: e.target.value,
                        })
                      }
                      className="bg-gray-900 border-gray-700 text-white text-base md:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-300 mb-1"
                    style={{
                      fontFamily: "PPValve ExtraLight, sans-serif",
                      fontWeight: 200,
                    }}
                  >
                    Product Website Link
                  </label>
                  <Input
                    type="url"
                    value={editingItem.product_link || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        product_link: e.target.value,
                      })
                    }
                    placeholder="https://example.com/product-page"
                    className="bg-gray-900 border-gray-700 text-white text-base md:text-sm"
                  />
                  <p
                    className="text-xs text-gray-400 mt-1"
                    style={{
                      fontFamily: "PPValve ExtraLight, sans-serif",
                      fontWeight: 200,
                    }}
                  >
                    Optional: Link to your product page for customer redirection
                  </p>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-300 mb-1"
                    style={{
                      fontFamily: "PPValve ExtraLight, sans-serif",
                      fontWeight: 200,
                    }}
                  >
                    Description
                  </label>
                  <Textarea
                    value={editingItem.description || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="bg-gray-900 border-gray-700 text-white text-base md:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-300 mb-1"
                      style={{
                        fontFamily: "PPValve ExtraLight, sans-serif",
                        fontWeight: 200,
                      }}
                    >
                      Category
                    </label>
                    <CategorySelect
                      value={editingItem.category || ""}
                      onChange={(v) =>
                        setEditingItem({ ...editingItem!, category: v })
                      }
                      placeholder="Select category"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-300 mb-1"
                      style={{
                        fontFamily: "PPValve ExtraLight, sans-serif",
                        fontWeight: 200,
                      }}
                    >
                      Price (PKR)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingItem.price ?? ""}
                      min={0}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                          setEditingItem({ ...editingItem, price: null });
                        } else {
                          const num = parseFloat(v);
                          setEditingItem({
                            ...editingItem,
                            price: Number.isFinite(num)
                              ? Math.max(0, num)
                              : editingItem.price,
                          });
                        }
                      }}
                      className="bg-gray-900 border-gray-700 text-white text-base md:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-300 mb-1"
                      style={{
                        fontFamily: "PPValve ExtraLight, sans-serif",
                        fontWeight: 200,
                      }}
                    >
                      Colour
                    </label>
                    <Input
                      value={editingItem.colour || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          colour: e.target.value,
                        })
                      }
                      placeholder="e.g., Red"
                      className="bg-gray-900 border-gray-700 text-white text-base md:text-sm"
                    />
                  </div>
                </div>

                {/* Product Attributes */}
                <div>
                  <h4
                    className="text-sm font-medium text-gray-300 mb-3"
                    style={{
                      fontFamily: "PPValve ExtraLight, sans-serif",
                      fontWeight: 200,
                    }}
                  >
                    Product Attributes
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-sm font-medium text-gray-300 mb-1"
                        style={{
                          fontFamily: "PPValve ExtraLight, sans-serif",
                          fontWeight: 200,
                        }}
                      >
                        Fabric Type
                      </label>
                      <select
                        value={editingItem.fabric_type || "MEDIUM_STRETCH"}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            fabric_type: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:border-[#642FD7] focus:ring-[#642FD7]"
                      >
                        <option value="RIGID">Rigid (No Stretch)</option>
                        <option value="MEDIUM_STRETCH">Medium Stretch</option>
                        <option value="HIGH_STRETCH">High Stretch</option>
                      </select>
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium text-gray-300 mb-1"
                        style={{
                          fontFamily: "PPValve ExtraLight, sans-serif",
                          fontWeight: 200,
                        }}
                      >
                        Season
                      </label>
                      <select
                        value={editingItem.season || "ALL_SEASON"}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            season: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:border-[#642FD7] focus:ring-[#642FD7]"
                      >
                        <option value="SUMMER">Summer</option>
                        <option value="WINTER">Winter</option>
                        <option value="SPRING">Spring</option>
                        <option value="FALL">Fall</option>
                        <option value="ALL_SEASON">All Season</option>
                      </select>
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium text-gray-300 mb-1"
                        style={{
                          fontFamily: "PPValve ExtraLight, sans-serif",
                          fontWeight: 200,
                        }}
                      >
                        Activity Type
                      </label>
                      <select
                        value={editingItem.activity || "CASUAL"}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            activity: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:border-[#642FD7] focus:ring-[#642FD7]"
                      >
                        <option value="CASUAL">Casual</option>
                        <option value="ATHLETIC">Athletic</option>
                        <option value="FORMAL">Formal</option>
                        <option value="BUSINESS">Business</option>
                      </select>
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium text-gray-300 mb-1"
                        style={{
                          fontFamily: "PPValve ExtraLight, sans-serif",
                          fontWeight: 200,
                        }}
                      >
                        Occasion
                      </label>
                      <select
                        value={editingItem.occasion || "WEEKEND_CASUAL"}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            occasion: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:border-[#642FD7] focus:ring-[#642FD7]"
                      >
                        <option value="WEEKEND_CASUAL">Weekend Casual</option>
                        <option value="BUSINESS_MEETING">
                          Business Meeting
                        </option>
                        <option value="PARTY">Party</option>
                        <option value="WORKOUT">Workout</option>
                        <option value="FORMAL_EVENT">Formal Event</option>
                      </select>
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium text-gray-300 mb-1"
                        style={{
                          fontFamily: "PPValve ExtraLight, sans-serif",
                          fontWeight: 200,
                        }}
                      >
                        Target Gender
                      </label>
                      <select
                        value={editingItem.gender || "UNISEX"}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            gender: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:border-[#642FD7] focus:ring-[#642FD7]"
                      >
                        <option value="MEN">Men&apos;s Clothing</option>
                        <option value="WOMEN">Women&apos;s Clothing</option>
                        <option value="UNISEX">
                          Unisex (Both Men & Women)
                        </option>
                        <option value="KIDS">Kids Clothing</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sizes Section */}
                <div>
                  <label
                    className="block text-sm font-medium text-gray-300 mb-3"
                    style={{
                      fontFamily: "PPValve ExtraLight, sans-serif",
                      fontWeight: 200,
                    }}
                  >
                    Available Sizes
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {sizeOptions.map((size) => (
                      <label key={size} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={!!editingSizes[size]?.available}
                          onChange={() => handleSizeToggle(size)}
                          className="rounded border-gray-600 bg-gray-900 text-[#642FD7] focus:ring-[#642FD7]"
                        />
                        <span
                          className="text-sm text-gray-300"
                          style={{
                            fontFamily: "PPValve ExtraLight, sans-serif",
                            fontWeight: 200,
                          }}
                        >
                          {size}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Size Measurements */}
                  {Object.entries(editingSizes).map(
                    ([size, sizeData]) =>
                      sizeData?.available && (
                        <div
                          key={size}
                          className="border border-gray-700 rounded-lg p-4 mb-4 bg-gray-900/50"
                        >
                          <h4
                            className="font-medium text-white mb-3"
                            style={{
                              fontFamily: "PPValve ExtraLight, sans-serif",
                              fontWeight: 200,
                            }}
                          >
                            {size} Measurements (inches)
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label
                                className="block text-xs text-gray-300 mb-1"
                                style={{
                                  fontFamily: "PPValve ExtraLight, sans-serif",
                                  fontWeight: 200,
                                }}
                              >
                                Width
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={sizeData.measurements?.width || ""}
                                onChange={(e) =>
                                  handleSizeMeasurementChange(
                                    size,
                                    "width",
                                    e.target.value,
                                  )
                                }
                                className="text-sm bg-gray-900 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs text-gray-300 mb-1"
                                style={{
                                  fontFamily: "PPValve ExtraLight, sans-serif",
                                  fontWeight: 200,
                                }}
                              >
                                Height
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={sizeData.measurements?.height || ""}
                                onChange={(e) =>
                                  handleSizeMeasurementChange(
                                    size,
                                    "height",
                                    e.target.value,
                                  )
                                }
                                className="text-sm bg-gray-900 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs text-gray-300 mb-1"
                                style={{
                                  fontFamily: "PPValve ExtraLight, sans-serif",
                                  fontWeight: 200,
                                }}
                              >
                                Waist
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={sizeData.measurements?.waist || ""}
                                onChange={(e) =>
                                  handleSizeMeasurementChange(
                                    size,
                                    "waist",
                                    e.target.value,
                                  )
                                }
                                className="text-sm bg-gray-900 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs text-gray-300 mb-1"
                                style={{
                                  fontFamily: "PPValve ExtraLight, sans-serif",
                                  fontWeight: 200,
                                }}
                              >
                                Shoulder
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={sizeData.measurements?.shoulder || ""}
                                onChange={(e) =>
                                  handleSizeMeasurementChange(
                                    size,
                                    "shoulder",
                                    e.target.value,
                                  )
                                }
                                className="text-sm bg-gray-900 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs text-gray-300 mb-1"
                                style={{
                                  fontFamily: "PPValve ExtraLight, sans-serif",
                                  fontWeight: 200,
                                }}
                              >
                                Chest
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={sizeData.measurements?.chest || ""}
                                onChange={(e) =>
                                  handleSizeMeasurementChange(
                                    size,
                                    "chest",
                                    e.target.value,
                                  )
                                }
                                className="text-sm bg-gray-900 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs text-gray-300 mb-1"
                                style={{
                                  fontFamily: "PPValve ExtraLight, sans-serif",
                                  fontWeight: 200,
                                }}
                              >
                                Length
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={sizeData.measurements?.length || ""}
                                onChange={(e) =>
                                  handleSizeMeasurementChange(
                                    size,
                                    "length",
                                    e.target.value,
                                  )
                                }
                                className="text-sm bg-gray-900 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs text-gray-300 mb-1"
                                style={{
                                  fontFamily: "PPValve ExtraLight, sans-serif",
                                  fontWeight: 200,
                                }}
                              >
                                Sleeve
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={sizeData.measurements?.sleeve || ""}
                                onChange={(e) =>
                                  handleSizeMeasurementChange(
                                    size,
                                    "sleeve",
                                    e.target.value,
                                  )
                                }
                                className="text-sm bg-gray-900 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <label
                                className="block text-xs text-gray-300 mb-1"
                                style={{
                                  fontFamily: "PPValve ExtraLight, sans-serif",
                                  fontWeight: 200,
                                }}
                              >
                                Inseam
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={sizeData.measurements?.inseam || ""}
                                onChange={(e) =>
                                  handleSizeMeasurementChange(
                                    size,
                                    "inseam",
                                    e.target.value,
                                  )
                                }
                                className="text-sm bg-gray-900 border-gray-700 text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ),
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 bg-gradient-to-r from-[#642FD7] to-[#F4536F] hover:from-[#642FD7]/90 hover:to-[#F4536F]/90 text-white border-0"
                    style={{
                      fontFamily: "PPValve ExtraLight, sans-serif",
                      fontWeight: 200,
                    }}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Item"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(null);
                      setEditingSizes({});
                    }}
                    disabled={isUpdating}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    style={{
                      fontFamily: "PPValve ExtraLight, sans-serif",
                      fontWeight: 200,
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
