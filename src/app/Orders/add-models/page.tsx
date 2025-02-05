"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import COMPANY_LOGO from "@/assets/needhagoldlogo.png"
import "./add-order.css";

const AddModelPage = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [modelName, setModelName] = useState("");
  const [purity, setPurity] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [items, setItems] = useState([]);
  const apiBaseUrl = 'YOUR_API_BASE_URL'; // Replace with your actual base URL

  useEffect(() => {
    fetchCategories();
    if (selectedCategory) {
      populateItemDropdown(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("https://needha-erp-server.onrender.com/category-groups");
      const result = await response.json();
      if (response.ok && result.success) {
        setCategories(result.data.map((category) => category.Name));
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const populateItemDropdown = async (categoryName) => {
    console.log("Fetching items for category:", categoryName);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/jewelry-models?Category=${encodeURIComponent(categoryName)}`
      );
      const result = await response.json();

      if (response.ok && result.success) {
        console.log("Item data fetched successfully:", result.data);
        setItems(result.data);
      } else {
        console.warn("Failed to fetch item data:", result.message);
      }
    } catch (error) {
      console.error("Error fetching item data:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !modelName || !purity || !size || !color) {
      alert("Please fill all required fields");
      return;
    }

    const modelData = {
      category: selectedCategory,
      modelName,
      purity,
      size,
      color,
      imageUrl,
    };

    try {
      const response = await fetch("https://needha-erp-server.onrender.com/add-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelData),
      });
      const result = await response.json();
      if (response.ok) {
        alert("Model added successfully");
      } else {
        alert("Error adding model");
      }
    } catch (error) {
      console.error("Error submitting model:", error);
    }
  };

  return (
    <div className="container">
      <h1>Add Model</h1>
      <div className="form-group">
        <Label>Category</Label>
        <Select onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="form-group">
        <Label>Model Name</Label>
        <Input value={modelName} onChange={(e) => setModelName(e.target.value)} />
      </div>
      <div className="form-group">
        <Label>Purity</Label>
        <Input value={purity} onChange={(e) => setPurity(e.target.value)} />
      </div>
      <div className="form-group">
        <Label>Size</Label>
        <Input value={size} onChange={(e) => setSize(e.target.value)} />
      </div>
      <div className="form-group">
        <Label>Color</Label>
        <Input value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <div className="form-group">
        <Label>Image URL</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>
      <div className="form-group">
        <Label>Item</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select Item" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.Id} value={item.Id} data-gross-weight={item.GrossWeight} data-image-url={item.ImageURL}>
                {item.Name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  );
};

export default AddModelPage;
