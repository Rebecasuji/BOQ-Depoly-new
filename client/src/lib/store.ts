import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role =
  | "admin"
  | "supplier"
  | "user"
  | "purchase_team"
  | "software_team";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  shopId?: string; // For suppliers
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  phoneCountryCode?: string; // +91, +1
  contactNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  image?: string;
  rating?: number;
  categories?: string[];
  gstNo?: string;
  // Optional owner (user id) for supplier-owned shops
  ownerId?: string;
}

export interface Material {
  id: string;
  name: string;
  code: string;
  rate: number;
  shopId: string;
  unit: string;
  category?: string;
  brandName?: string;
  modelNumber?: string;
  subCategory?: string;
  technicalSpecification?: string;
  image?: string;
  // New fields
  dimensions?: string;
  finish?: string;
  metalType?: string;
}

interface CartItem {
  materialId: string;
  quantity: number;
}

export interface ShopApprovalRequest {
  id: string;
  shop: Shop;
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

export interface MaterialApprovalRequest {
  id: string;
  material: Material;
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

export interface SupportMessage {
  id: string;
  message: string;
  sentBy: string;
  sentByRole: string;
  sentAt: string;
  isRead: boolean;
}

interface DataContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;

  shops: Shop[];
  materials: Material[];
  cart: CartItem[];
  approvalRequests: ShopApprovalRequest[];
  supportMessages: SupportMessage[];
  addShop: (shop: Shop) => void;
  addMaterial: (material: Material) => void;
  submitShopForApproval: (shop: Shop) => void;
  approveShop: (requestId: string) => void;
  rejectShop: (requestId: string, reason: string) => void;
  addSupportMessage: (message: string) => void;
  addToCart: (materialId: string, quantity: number) => void;
  removeFromCart: (materialId: string) => void;
  deleteShop: (shopId: string) => void;
  deleteMaterial: (materialId: string) => void;

  materialApprovalRequests: MaterialApprovalRequest[];
  submitMaterialForApproval: (material: Material) => void;
  approveMaterial: (requestId: string) => void;
  rejectMaterial: (requestId: string, reason: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [approvalRequests, setApprovalRequests] = useState<
    ShopApprovalRequest[]
  >([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [materialApprovalRequests, setMaterialApprovalRequests] = useState<
    MaterialApprovalRequest[]
  >([]);

  const [shops, setShops] = useState<Shop[]>([
    {
      id: "1",
      name: "City Hardware",
      location: "Downtown",
      phone: "+1-212-5551001",
      contactNumber: "212-555-1001",
      city: "New York",
      state: "NY",
      country: "USA",
      pincode: "10001",
      rating: 4.5,
      categories: [
        "Civil",
        "Gypsum",
        "Plywood",
        "Flooring",
        "Painting",
        "Doors",
        "Blinds",
        "Electrical",
        "Plumbing",
      ],
      gstNo: "12AABCT1234H1Z1",
    },
    {
      id: "2",
      name: "Builder's Haven",
      location: "Mall Area",
      phone: "+1-213-5551002",
      contactNumber: "213-555-1002",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      pincode: "90001",
      rating: 4.2,
      categories: [
        "Civil",
        "Plywood",
        "Glass",
        "Flooring",
        "Painting",
        "Doors",
        "Electrical",
      ],
      gstNo: "12AABCT1234H1Z2",
    },
    {
      id: "3",
      name: "BuildMart Standard",
      location: "City Center",
      phone: "+1-312-5551003",
      contactNumber: "312-555-1003",
      city: "Chicago",
      state: "IL",
      country: "USA",
      pincode: "60601",
      rating: 4.2,
      categories: [
        "Civil",
        "Gypsum",
        "Plywood",
        "Flooring",
        "Painting",
        "Doors",
        "Blinds",
      ],
      gstNo: "12AABCT1234H1Z3",
    },
    {
      id: "4",
      name: "Premium Construction Hub",
      location: "Business District",
      phone: "+1-617-5551004",
      contactNumber: "617-555-1004",
      city: "Boston",
      state: "MA",
      country: "USA",
      pincode: "02101",
      rating: 4.7,
      categories: [
        "Civil",
        "Gypsum",
        "Glass",
        "Flooring",
        "Painting",
        "Doors",
        "Electrical",
        "Plumbing",
      ],
      gstNo: "12AABCT1234H1Z4",
    },
    {
      id: "5",
      name: "Budget Materials Co",
      location: "Industrial Area",
      phone: "+1-303-5551005",
      contactNumber: "303-555-1005",
      city: "Denver",
      state: "CO",
      country: "USA",
      pincode: "80201",
      rating: 3.8,
      categories: ["Civil", "Plywood", "Flooring", "Painting", "Doors"],
      gstNo: "12AABCT1234H1Z5",
    },
    {
      id: "6",
      name: "Apex Construction Materials",
      location: "North Avenue",
      phone: "+1-206-5551006",
      contactNumber: "206-555-1006",
      city: "Seattle",
      state: "WA",
      country: "USA",
      pincode: "98101",
      rating: 4.4,
      categories: [
        "Civil",
        "Gypsum",
        "Plywood",
        "Electrical",
        "Plumbing",
        "Blinds",
      ],
      gstNo: "12AABCT1234H1Z6",
    },
    {
      id: "7",
      name: "TechBuild Solutions",
      location: "Tech Park",
      phone: "+1-415-5551007",
      contactNumber: "415-555-1007",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      pincode: "94102",
      rating: 4.6,
      categories: [
        "Gypsum",
        "Glass",
        "Plywood",
        "Painting",
        "Electrical",
        "Doors",
      ],
      gstNo: "12AABCT1234H1Z7",
    },
    {
      id: "8",
      name: "Value Materials Mart",
      location: "Suburban Area",
      phone: "+1-512-5551008",
      contactNumber: "512-555-1008",
      city: "Austin",
      state: "TX",
      country: "USA",
      pincode: "78701",
      rating: 3.9,
      categories: ["Civil", "Plywood", "Flooring", "Painting", "Plumbing"],
      gstNo: "12AABCT1234H1Z8",
    },
    // New shops for additional estimators
    {
      id: "9",
      name: "FireSafe Supplies",
      location: "Industrial Area",
      phone: "+1-617-5551010",
      contactNumber: "617-555-1010",
      city: "Boston",
      state: "MA",
      country: "USA",
      pincode: "02110",
      rating: 4.3,
      categories: ["FireFighting", "Plumbing"],
      gstNo: "12FIRE1234H1Z9",
    },
    {
      id: "10",
      name: "MetalWorks Co",
      location: "Harbor Road",
      phone: "+1-212-5551011",
      contactNumber: "212-555-1011",
      city: "New York",
      state: "NY",
      country: "USA",
      pincode: "10002",
      rating: 4.4,
      categories: ["MSWork", "SSWork", "Civil"],
      gstNo: "12METAL1234H1Z10",
    },
    {
      id: "11",
      name: "Ceilings & Panels",
      location: "Warehouse District",
      phone: "+1-213-5551012",
      contactNumber: "213-555-1012",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      pincode: "90002",
      rating: 4.1,
      categories: ["FalseCeiling", "Gypsum", "Plywood"],
      gstNo: "12CEIL1234H1Z11",
    },
  ]);

  const [materials, setMaterials] = useState<Material[]>([
    // Shop 1 - City Hardware (Civil, Gypsum, Plywood)
    {
      id: "1",
      name: "Red Brick",
      code: "BRICK-001",
      rate: 7,
      shopId: "1",
      unit: "pcs",
      category: "Civil",
      brandName: "CityBuild",
    },
    {
      id: "2",
      name: "Cement Bag (OPC)",
      code: "CEMENT-001",
      rate: 400,
      shopId: "1",
      unit: "bag",
      category: "Civil",
      brandName: "UltraTech",
    },
    {
      id: "3",
      name: "River Sand",
      code: "SAND-001",
      rate: 25,
      shopId: "1",
      unit: "cft",
      category: "Civil",
      brandName: "Nature",
    },
    {
      id: "4",
      name: "Standard Gypsum Board",
      code: "GYP-001",
      rate: 40,
      shopId: "1",
      unit: "pcs",
      category: "Gypsum",
    },
    {
      id: "5",
      name: "Birch Plywood",
      code: "PLY-001",
      rate: 450,
      shopId: "1",
      unit: "sheet",
      category: "Plywood",
    },

    // Shop 2 - Builder's Haven (Civil, Plywood, Glass)
    {
      id: "6",
      name: "Fly Ash Brick",
      code: "BRICK-002",
      rate: 6,
      shopId: "2",
      unit: "pcs",
      category: "Civil",
      brandName: "EcoBuild",
    },
    {
      id: "7",
      name: "Cement Bag (PPC)",
      code: "CEMENT-002",
      rate: 360,
      shopId: "2",
      unit: "bag",
      category: "Civil",
      brandName: "LafargeHolcim",
    },
    {
      id: "8",
      name: "M-Sand",
      code: "SAND-002",
      rate: 30,
      shopId: "2",
      unit: "cft",
      category: "Civil",
    },
    {
      id: "9",
      name: "Marine Plywood",
      code: "PLY-002",
      rate: 520,
      shopId: "2",
      unit: "sheet",
      category: "Plywood",
    },
    {
      id: "10",
      name: "Clear Tempered Glass",
      code: "GLASS-001",
      rate: 350,
      shopId: "2",
      unit: "sqft",
      category: "Glass",
    },

    // Shop 3 - BuildMart Standard (Civil, Gypsum, Plywood)
    {
      id: "11",
      name: "Solid Concrete Brick",
      code: "BRICK-003",
      rate: 13,
      shopId: "3",
      unit: "pcs",
      category: "Civil",
    },
    {
      id: "12",
      name: "Slag Portland Cement",
      code: "CEMENT-003",
      rate: 420,
      shopId: "3",
      unit: "bag",
      category: "Civil",
    },
    {
      id: "13",
      name: "Crushed Stone Sand",
      code: "SAND-003",
      rate: 35,
      shopId: "3",
      unit: "cft",
      category: "Civil",
    },
    {
      id: "14",
      name: "Fire-Resistant Gypsum",
      code: "GYP-002",
      rate: 60,
      shopId: "3",
      unit: "pcs",
      category: "Gypsum",
    },
    {
      id: "15",
      name: "Commercial Plywood",
      code: "PLY-003",
      rate: 380,
      shopId: "3",
      unit: "sheet",
      category: "Plywood",
    },

    // Shop 4 - Premium Construction Hub (Civil, Gypsum, Glass)
    {
      id: "16",
      name: "Premium Red Brick",
      code: "BRICK-004",
      rate: 8,
      shopId: "4",
      unit: "pcs",
      category: "Civil",
      brandName: "Premium",
    },
    {
      id: "17",
      name: "Premium Cement",
      code: "CEMENT-004",
      rate: 450,
      shopId: "4",
      unit: "bag",
      category: "Civil",
      brandName: "Ambuja",
    },
    {
      id: "18",
      name: "Premium Sand",
      code: "SAND-004",
      rate: 28,
      shopId: "4",
      unit: "cft",
      category: "Civil",
    },
    {
      id: "19",
      name: "Moisture-Resistant Gypsum",
      code: "GYP-003",
      rate: 65,
      shopId: "4",
      unit: "pcs",
      category: "Gypsum",
    },
    {
      id: "20",
      name: "Frosted Tempered Glass",
      code: "GLASS-002",
      rate: 400,
      shopId: "4",
      unit: "sqft",
      category: "Glass",
    },

    // Shop 5 - Budget Materials Co (Civil, Plywood)
    {
      id: "21",
      name: "Budget Brick",
      code: "BRICK-005",
      rate: 5.5,
      shopId: "5",
      unit: "pcs",
      category: "Civil",
    },
    {
      id: "22",
      name: "Budget Cement",
      code: "CEMENT-005",
      rate: 350,
      shopId: "5",
      unit: "bag",
      category: "Civil",
    },
    {
      id: "23",
      name: "Budget Sand",
      code: "SAND-005",
      rate: 22,
      shopId: "5",
      unit: "cft",
      category: "Civil",
    },
    {
      id: "24",
      name: "Budget Plywood",
      code: "PLY-004",
      rate: 350,
      shopId: "5",
      unit: "sheet",
      category: "Plywood",
    },

    // Shop 6 - Apex Construction (Civil, Gypsum, Plywood)
    {
      id: "25",
      name: "Standard Brick",
      code: "BRICK-006",
      rate: 7.5,
      shopId: "6",
      unit: "pcs",
      category: "Civil",
    },
    {
      id: "26",
      name: "Standard Cement",
      code: "CEMENT-006",
      rate: 410,
      shopId: "6",
      unit: "bag",
      category: "Civil",
    },
    {
      id: "27",
      name: "Standard Sand",
      code: "SAND-006",
      rate: 26,
      shopId: "6",
      unit: "cft",
      category: "Civil",
    },
    {
      id: "28",
      name: "Standard Gypsum",
      code: "GYP-004",
      rate: 42,
      shopId: "6",
      unit: "pcs",
      category: "Gypsum",
    },
    {
      id: "29",
      name: "Standard Plywood",
      code: "PLY-005",
      rate: 400,
      shopId: "6",
      unit: "sheet",
      category: "Plywood",
    },

    // Shop 7 - TechBuild Solutions (Gypsum, Glass, Plywood)
    {
      id: "30",
      name: "Advanced Gypsum Board",
      code: "GYP-005",
      rate: 70,
      shopId: "7",
      unit: "pcs",
      category: "Gypsum",
      brandName: "TechGypsum",
    },
    {
      id: "31",
      name: "Advanced Plywood",
      code: "PLY-006",
      rate: 550,
      shopId: "7",
      unit: "sheet",
      category: "Plywood",
      brandName: "TechPly",
    },
    {
      id: "32",
      name: "Premium Glass Panel",
      code: "GLASS-003",
      rate: 420,
      shopId: "7",
      unit: "sqft",
      category: "Glass",
    },
    {
      id: "33",
      name: "Aluminum Frame",
      code: "FRAME-001",
      rate: 220,
      shopId: "7",
      unit: "meter",
      category: "Glass",
    },

    // Shop 8 - Value Materials Mart (Civil, Plywood)
    {
      id: "34",
      name: "Economy Brick",
      code: "BRICK-007",
      rate: 6,
      shopId: "8",
      unit: "pcs",
      category: "Civil",
    },
    {
      id: "35",
      name: "Economy Cement",
      code: "CEMENT-007",
      rate: 380,
      shopId: "8",
      unit: "bag",
      category: "Civil",
    },
    {
      id: "36",
      name: "Economy Sand",
      code: "SAND-007",
      rate: 24,
      shopId: "8",
      unit: "cft",
      category: "Civil",
    },
    {
      id: "37",
      name: "Economy Plywood",
      code: "PLY-007",
      rate: 360,
      shopId: "8",
      unit: "sheet",
      category: "Plywood",
    },

    // Flooring Materials (Shops 1,2,3,4,5)
    {
      id: "38",
      name: "Vitrified Tiles",
      code: "FLOOR-001",
      rate: 120,
      shopId: "1",
      unit: "sqft",
      category: "Flooring",
      brandName: "Kajaria",
    },
    {
      id: "39",
      name: "Marble",
      code: "FLOOR-002",
      rate: 250,
      shopId: "1",
      unit: "sqft",
      category: "Flooring",
      brandName: "Italian",
    },
    {
      id: "40",
      name: "Granite",
      code: "FLOOR-003",
      rate: 200,
      shopId: "2",
      unit: "sqft",
      category: "Flooring",
      brandName: "Black",
    },
    {
      id: "41",
      name: "Wooden Flooring",
      code: "FLOOR-004",
      rate: 180,
      shopId: "2",
      unit: "sqft",
      category: "Flooring",
      brandName: "Teak",
    },
    {
      id: "42",
      name: "Adhesive (Flooring)",
      code: "FLOOR-ADH",
      rate: 15,
      shopId: "3",
      unit: "kg",
      category: "Flooring",
    },
    {
      id: "43",
      name: "Grout",
      code: "FLOOR-GROUT",
      rate: 8,
      shopId: "3",
      unit: "kg",
      category: "Flooring",
    },

    // Painting Materials (Shops 1,2,3,4,7)
    {
      id: "44",
      name: "Primer",
      code: "PAINT-001",
      rate: 280,
      shopId: "1",
      unit: "liter",
      category: "Painting",
      brandName: "Asian",
    },
    {
      id: "45",
      name: "Emulsion Paint",
      code: "PAINT-002",
      rate: 350,
      shopId: "1",
      unit: "liter",
      category: "Painting",
      brandName: "Berger",
    },
    {
      id: "46",
      name: "Sandpaper",
      code: "PAINT-003",
      rate: 12,
      shopId: "2",
      unit: "sheet",
      category: "Painting",
    },
    {
      id: "47",
      name: "Putty",
      code: "PAINT-004",
      rate: 200,
      shopId: "3",
      unit: "kg",
      category: "Painting",
      brandName: "Birla",
    },
    {
      id: "48",
      name: "Enamel Paint",
      code: "PAINT-005",
      rate: 420,
      shopId: "4",
      unit: "liter",
      category: "Painting",
    },
    {
      id: "49",
      name: "Wood Varnish",
      code: "PAINT-006",
      rate: 380,
      shopId: "7",
      unit: "liter",
      category: "Painting",
    },

    // Door Materials (Shops 1,2,3,4,7)
    {
      id: "50",
      name: "Door Frame",
      code: "DOOR-001",
      rate: 15,
      shopId: "1",
      unit: "rft",
      category: "Doors",
      brandName: "Teakwood",
    },
    {
      id: "51",
      name: "Flush Door Shutter",
      code: "DOOR-002",
      rate: 1200,
      shopId: "1",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "52",
      name: "Wooden Panel Door",
      code: "DOOR-003",
      rate: 1800,
      shopId: "2",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "53",
      name: "UPVC Door",
      code: "DOOR-004",
      rate: 800,
      shopId: "2",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "54",
      name: "Door Hinges (SS)",
      code: "DOOR-005",
      rate: 45,
      shopId: "3",
      unit: "pair",
      category: "Doors",
    },
    {
      id: "55",
      name: "Door Lock",
      code: "DOOR-006",
      rate: 280,
      shopId: "3",
      unit: "set",
      category: "Doors",
    },
    {
      id: "56",
      name: "Tower Bolt",
      code: "DOOR-007",
      rate: 85,
      shopId: "4",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "57",
      name: "Door Stopper",
      code: "DOOR-008",
      rate: 30,
      shopId: "4",
      unit: "nos",
      category: "Doors",
    },

    // Additional Door Materials - Multiple Shops (for comparison)
    // Door Frame (DOOR-001) - Multiple Shops
    {
      id: "57a",
      name: "Door Frame",
      code: "DOOR-001",
      rate: 18,
      shopId: "2",
      unit: "rft",
      category: "Doors",
      brandName: "Teakwood",
    },
    {
      id: "57b",
      name: "Door Frame",
      code: "DOOR-001",
      rate: 16,
      shopId: "3",
      unit: "rft",
      category: "Doors",
      brandName: "Teakwood",
    },
    {
      id: "57c",
      name: "Door Frame",
      code: "DOOR-001",
      rate: 20,
      shopId: "4",
      unit: "rft",
      category: "Doors",
      brandName: "Teakwood Premium",
    },
    {
      id: "57d",
      name: "Door Frame",
      code: "DOOR-001",
      rate: 14,
      shopId: "5",
      unit: "rft",
      category: "Doors",
      brandName: "Teakwood Budget",
    },

    // Flush Door Shutter (DOOR-002) - Multiple Shops
    {
      id: "58a",
      name: "Flush Door Shutter",
      code: "DOOR-002",
      rate: 1100,
      shopId: "2",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "58b",
      name: "Flush Door Shutter",
      code: "DOOR-002",
      rate: 1150,
      shopId: "3",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "58c",
      name: "Flush Door Shutter",
      code: "DOOR-002",
      rate: 1250,
      shopId: "4",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "58d",
      name: "Flush Door Shutter",
      code: "DOOR-002",
      rate: 1050,
      shopId: "5",
      unit: "nos",
      category: "Doors",
    },

    // Wooden Panel Door (DOOR-003) - Multiple Shops
    {
      id: "59a",
      name: "Wooden Panel Door",
      code: "DOOR-003",
      rate: 1700,
      shopId: "3",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "59b",
      name: "Wooden Panel Door",
      code: "DOOR-003",
      rate: 1900,
      shopId: "4",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "59c",
      name: "Wooden Panel Door",
      code: "DOOR-003",
      rate: 1600,
      shopId: "5",
      unit: "nos",
      category: "Doors",
    },

    // UPVC Door (DOOR-004) - Multiple Shops
    {
      id: "60a",
      name: "UPVC Door",
      code: "DOOR-004",
      rate: 750,
      shopId: "3",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "60b",
      name: "UPVC Door",
      code: "DOOR-004",
      rate: 820,
      shopId: "4",
      unit: "nos",
      category: "Doors",
    },
    {
      id: "60c",
      name: "UPVC Door",
      code: "DOOR-004",
      rate: 700,
      shopId: "5",
      unit: "nos",
      category: "Doors",
    },

    // Door Hinges (DOOR-005) - Multiple Shops
    {
      id: "61a",
      name: "Door Hinges (SS)",
      code: "DOOR-005",
      rate: 50,
      shopId: "2",
      unit: "pair",
      category: "Doors",
    },
    {
      id: "61b",
      name: "Door Hinges (SS)",
      code: "DOOR-005",
      rate: 48,
      shopId: "4",
      unit: "pair",
      category: "Doors",
    },
    {
      id: "61c",
      name: "Door Hinges (SS)",
      code: "DOOR-005",
      rate: 42,
      shopId: "5",
      unit: "pair",
      category: "Doors",
    },

    // Door Lock (DOOR-006) - Multiple Shops
    {
      id: "62a",
      name: "Door Lock",
      code: "DOOR-006",
      rate: 270,
      shopId: "2",
      unit: "set",
      category: "Doors",
    },
    {
      id: "62b",
      name: "Door Lock",
      code: "DOOR-006",
      rate: 300,
      shopId: "4",
      unit: "set",
      category: "Doors",
    },
    {
      id: "62c",
      name: "Door Lock",
      code: "DOOR-006",
      rate: 250,
      shopId: "5",
      unit: "set",
      category: "Doors",
    },

    // Clear Tempered Glass (GLASS-001) - Multiple Shops
    {
      id: "63a",
      name: "Clear Tempered Glass",
      code: "GLASS-001",
      rate: 320,
      shopId: "4",
      unit: "sqft",
      category: "Glass",
    },
    {
      id: "63b",
      name: "Clear Tempered Glass",
      code: "GLASS-001",
      rate: 300,
      shopId: "6",
      unit: "sqft",
      category: "Glass",
    },
    {
      id: "63c",
      name: "Clear Tempered Glass",
      code: "GLASS-001",
      rate: 340,
      shopId: "7",
      unit: "sqft",
      category: "Glass",
    },

    // Frosted Tempered Glass (GLASS-002) - Multiple Shops
    {
      id: "64a",
      name: "Frosted Tempered Glass",
      code: "GLASS-002",
      rate: 380,
      shopId: "4",
      unit: "sqft",
      category: "Glass",
    },
    {
      id: "64b",
      name: "Frosted Tempered Glass",
      code: "GLASS-002",
      rate: 400,
      shopId: "6",
      unit: "sqft",
      category: "Glass",
    },
    {
      id: "64c",
      name: "Frosted Tempered Glass",
      code: "GLASS-002",
      rate: 420,
      shopId: "7",
      unit: "sqft",
      category: "Glass",
    },

    // Aluminum Frame (FRAME-001) - Multiple Shops
    {
      id: "65a",
      name: "Aluminum Frame",
      code: "FRAME-001",
      rate: 210,
      shopId: "6",
      unit: "meter",
      category: "Glass",
    },
    {
      id: "65b",
      name: "Aluminum Frame",
      code: "FRAME-001",
      rate: 230,
      shopId: "7",
      unit: "meter",
      category: "Glass",
    },
    {
      id: "65c",
      name: "Aluminum Frame",
      code: "FRAME-001",
      rate: 240,
      shopId: "4",
      unit: "meter",
      category: "Glass",
    },

    // Blinds Materials (Shops 1,3,6)
    {
      id: "58",
      name: "Roller Blind Fabric",
      code: "BLIND-001",
      rate: 80,
      shopId: "1",
      unit: "sqft",
      category: "Blinds",
      brandName: "Premium",
    },
    {
      id: "59",
      name: "Venetian Blind Slats",
      code: "BLIND-002",
      rate: 120,
      shopId: "1",
      unit: "sqft",
      category: "Blinds",
    },
    {
      id: "60",
      name: "Roman Blind Fabric",
      code: "BLIND-003",
      rate: 100,
      shopId: "3",
      unit: "sqft",
      category: "Blinds",
    },
    {
      id: "61",
      name: "Blind Installation Kit",
      code: "BLIND-KIT",
      rate: 180,
      shopId: "3",
      unit: "set",
      category: "Blinds",
    },
    {
      id: "62",
      name: "Blind Brackets",
      code: "BLIND-005",
      rate: 45,
      shopId: "6",
      unit: "pair",
      category: "Blinds",
    },

    // Electrical Materials (Shops 1,2,4,6,7)
    {
      id: "63",
      name: "Switch Point",
      code: "ELEC-001",
      rate: 65,
      shopId: "1",
      unit: "nos",
      category: "Electrical",
      brandName: "Anchor",
    },
    {
      id: "64",
      name: "Plug Point",
      code: "ELEC-002",
      rate: 85,
      shopId: "1",
      unit: "nos",
      category: "Electrical",
      brandName: "Anchor",
    },
    {
      id: "65",
      name: "Light Fixture",
      code: "ELEC-003",
      rate: 280,
      shopId: "2",
      unit: "nos",
      category: "Electrical",
    },
    {
      id: "66",
      name: "Wiring (2.5 sqmm)",
      code: "ELEC-004",
      rate: 12,
      shopId: "2",
      unit: "meter",
      category: "Electrical",
    },
    {
      id: "67",
      name: "Circuit Breaker",
      code: "ELEC-005",
      rate: 180,
      shopId: "4",
      unit: "nos",
      category: "Electrical",
    },
    {
      id: "68",
      name: "Electrical Conduit",
      code: "ELEC-006",
      rate: 25,
      shopId: "4",
      unit: "meter",
      category: "Electrical",
    },
    {
      id: "69",
      name: "Junction Box",
      code: "ELEC-007",
      rate: 45,
      shopId: "6",
      unit: "nos",
      category: "Electrical",
    },
    {
      id: "70",
      name: "Panel Board",
      code: "ELEC-008",
      rate: 3500,
      shopId: "7",
      unit: "nos",
      category: "Electrical",
    },

    // Plumbing Materials (Shops 1,4,6,8)
    {
      id: "71",
      name: "PVC Pipe 20mm",
      code: "PLUMB-001",
      rate: 45,
      shopId: "1",
      unit: "meter",
      category: "Plumbing",
    },
    {
      id: "72",
      name: "Sink Basin",
      code: "PLUMB-002",
      rate: 2800,
      shopId: "1",
      unit: "nos",
      category: "Plumbing",
    },
    {
      id: "73",
      name: "Sanitary Fittings",
      code: "PLUMB-003",
      rate: 120,
      shopId: "4",
      unit: "nos",
      category: "Plumbing",
    },
    {
      id: "74",
      name: "Drain Pipe",
      code: "PLUMB-004",
      rate: 55,
      shopId: "4",
      unit: "meter",
      category: "Plumbing",
    },
    {
      id: "75",
      name: "Water Tap",
      code: "PLUMB-005",
      rate: 450,
      shopId: "4",
      unit: "nos",
      category: "Plumbing",
      brandName: "Jaquar",
    },
    {
      id: "76",
      name: "Toilet Seat",
      code: "PLUMB-006",
      rate: 3200,
      shopId: "6",
      unit: "nos",
      category: "Plumbing",
    },
    {
      id: "77",
      name: "Water Tank",
      code: "PLUMB-007",
      rate: 8500,
      shopId: "6",
      unit: "nos",
      category: "Plumbing",
    },
    {
      id: "78",
      name: "Plumbing Elbow",
      code: "PLUMB-008",
      rate: 35,
      shopId: "8",
      unit: "nos",
      category: "Plumbing",
    },
    // Firefighting Materials (Shop 9)
    {
      id: "79",
      name: "Fire Sprinkler Head",
      code: "FIRE-001",
      rate: 1200,
      shopId: "9",
      unit: "nos",
      category: "FireFighting",
    },
    {
      id: "80",
      name: "Fire Hydrant Valve",
      code: "FIRE-002",
      rate: 8500,
      shopId: "9",
      unit: "nos",
      category: "FireFighting",
    },
    {
      id: "81",
      name: "Fire Pump (Small)",
      code: "FIRE-003",
      rate: 45000,
      shopId: "9",
      unit: "nos",
      category: "FireFighting",
    },

    // MS Work / Structural (Shop 10)
    {
      id: "82",
      name: "MS Angle 50x50x5",
      code: "MS-ANGLE-001",
      rate: 120,
      shopId: "10",
      unit: "kg",
      category: "MSWork",
    },
    {
      id: "83",
      name: "MS Plate 6mm",
      code: "MS-PLATE-001",
      rate: 220,
      shopId: "10",
      unit: "kg",
      category: "MSWork",
    },
    {
      id: "84",
      name: "Welding Electrodes",
      code: "MS-WELD-001",
      rate: 80,
      shopId: "10",
      unit: "kg",
      category: "MSWork",
    },

    // SS Work (Shop 10)
    {
      id: "85",
      name: "SS Railing Section",
      code: "SS-RAIL-001",
      rate: 480,
      shopId: "10",
      unit: "meter",
      category: "SSWork",
    },
    {
      id: "86",
      name: "SS Sheet 2mm",
      code: "SS-SHEET-001",
      rate: 300,
      shopId: "10",
      unit: "sqm",
      category: "SSWork",
    },

    // False Ceiling materials (Shop 11)
    {
      id: "87",
      name: "Gypsum False Ceiling Tile",
      code: "FC-001",
      rate: 55,
      shopId: "11",
      unit: "sqft",
      category: "FalseCeiling",
    },
    {
      id: "88",
      name: "T-Grid Channel",
      code: "FC-002",
      rate: 30,
      shopId: "11",
      unit: "meter",
      category: "FalseCeiling",
    },
    {
      id: "89",
      name: "Suspension Rod",
      code: "FC-003",
      rate: 15,
      shopId: "11",
      unit: "nos",
      category: "FalseCeiling",
    },
  ]);

  const [cart, setCart] = useState<CartItem[]>([]);

  const login = (userData: User) => {
    // If supplier, try to find an approved shop owned by this user and attach it
    if (userData.role === "supplier") {
      const ownedShop = shops.find((s) => s.ownerId === userData.id);
      if (ownedShop) {
        setUser({ ...userData, shopId: ownedShop.id });
        return;
      }
    }
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const submitShopForApproval = (shop: Shop) => {
    const request: ShopApprovalRequest = {
      id: Math.random().toString(),
      // attach owner when a supplier creates the shop
      shop: { ...shop, ownerId: user?.id },
      submittedBy: user?.name || "Unknown",
      submittedAt: new Date().toISOString(),
      status: "pending",
    };
    setApprovalRequests([...approvalRequests, request]);
  };

  const approveShop = (requestId: string) => {
    const request = approvalRequests.find((r) => r.id === requestId);
    if (request) {
      // Ensure ownerId carried over so supplier's page can show their shop
      const shopToAdd = { ...request.shop } as Shop;
      setShops([...shops, shopToAdd]);
      setApprovalRequests(
        approvalRequests.map((r) =>
          r.id === requestId ? { ...r, status: "approved" as const } : r,
        ),
      );
    }
  };

  const rejectShop = (requestId: string, reason: string) => {
    setApprovalRequests(
      approvalRequests.map((r) =>
        r.id === requestId
          ? { ...r, status: "rejected" as const, rejectionReason: reason }
          : r,
      ),
    );
  };

  const addShop = (shop: Shop) => {
    if (!shops.find((s) => s.id === shop.id)) {
      setShops([...shops, shop]);
    }
  };

  const addMaterial = (material: Material) => {
    if (!materials.find((m) => m.id === material.id)) {
      setMaterials([...materials, material]);
    }
  };

  const deleteShop = (shopId: string) => {
    // Only admin or software_team can delete shops
    if (user?.role !== "admin" && user?.role !== "software_team") return;
    setShops(shops.filter((s) => s.id !== shopId));
    // also delete materials belonging to the shop
    setMaterials(materials.filter((m) => m.shopId !== shopId));
  };

  const deleteMaterial = (materialId: string) => {
    // Only admin or software_team can delete materials
    if (user?.role !== "admin" && user?.role !== "software_team") return;
    setMaterials(materials.filter((m) => m.id !== materialId));
  };

  // Material approval workflow
  const submitMaterialForApproval = (material: Material) => {
    const request: MaterialApprovalRequest = {
      id: Math.random().toString(),
      // If supplier is adding a material, attach their shopId automatically
      material: { ...material, shopId: material.shopId || user?.shopId || "" },
      submittedBy: user?.name || "Unknown",
      submittedAt: new Date().toISOString(),
      status: "pending",
    };
    setMaterialApprovalRequests([...materialApprovalRequests, request]);
  };

  const approveMaterial = (requestId: string) => {
    const request = materialApprovalRequests.find((r) => r.id === requestId);
    if (request) {
      // ensure material has a shopId (supplier submissions get their shop)
      const matToAdd = { ...request.material } as Material;
      if (!matToAdd.shopId && user?.shopId) matToAdd.shopId = user.shopId;
      setMaterials([...materials, matToAdd]);
      setMaterialApprovalRequests(
        materialApprovalRequests.map((r) =>
          r.id === requestId ? { ...r, status: "approved" as const } : r,
        ),
      );
    }
  };

  const rejectMaterial = (requestId: string, reason: string) => {
    setMaterialApprovalRequests(
      materialApprovalRequests.map((r) =>
        r.id === requestId
          ? { ...r, status: "rejected" as const, rejectionReason: reason }
          : r,
      ),
    );
  };

  const addSupportMessage = (message: string) => {
    const supportMsg: SupportMessage = {
      id: Math.random().toString(),
      message,
      sentBy: user?.name || "Unknown",
      sentByRole: user?.role || "unknown",
      sentAt: new Date().toISOString(),
      isRead: false,
    };
    setSupportMessages([...supportMessages, supportMsg]);
  };

  const addToCart = (materialId: string, quantity: number) => {
    const existing = cart.find((c) => c.materialId === materialId);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.materialId === materialId
            ? { ...c, quantity: c.quantity + quantity }
            : c,
        ),
      );
    } else {
      setCart([...cart, { materialId, quantity }]);
    }
  };

  const removeFromCart = (materialId: string) => {
    setCart(cart.filter((c) => c.materialId !== materialId));
  };

  const value: DataContextType = {
    user,
    login,
    logout,
    shops,
    materials,
    cart,
    approvalRequests,
    supportMessages,
    materialApprovalRequests,
    addShop,
    addMaterial,
    submitShopForApproval,
    submitMaterialForApproval,
    approveShop,
    approveMaterial,
    rejectShop,
    rejectMaterial,
    addSupportMessage,
    addToCart,
    removeFromCart,
  };

  return React.createElement(DataContext.Provider, { value }, children);
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
}
