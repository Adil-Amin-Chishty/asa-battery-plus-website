import type { Brand } from "./brands";
export type Battery = {
  id: string;
  brand: Brand;
  model: string;
  category: "Car Batteries";
  batteryType: "Maintenance-free" | "Dry-charged";
  voltage: number;
  capacityAh: number;
  application: string;
  warranty: string;
  price: number | null;
  image: string;
  imageNote?: string;
  availability: string;
  featured: boolean;
  priceSource: string;
  priceDate: string;
};
// Published manufacturer reference prices, not confirmed ASA quotations or live inventory.
export const batteries: Battery[] = [
  {
    id: "osaka-ht60l",
    brand: "OSAKA",
    model: "HT 60L",
    batteryType: "Dry-charged",
    capacityAh: 38,
    application: "Compact cars",
    warranty: "Confirm terms with shop",
    price: 8708,
    image: "/products/osaka.webp",
    priceSource:
      "https://acmgroup.com.pk/wp-content/uploads/2026/06/Osaka-Price-List.pdf",
    priceDate: "13 March 2026",
    category: "Car Batteries",
    voltage: 12,
    availability: "Confirm stock on WhatsApp",
    featured: true,
  },
  {
    id: "volta-vmf65l",
    brand: "VOLTA",
    model: "VMF 65L",
    batteryType: "Maintenance-free",
    capacityAh: 40,
    application: "Compact cars",
    warranty: "Confirm terms with shop",
    price: 10095,
    image: "/products/volta.webp",
    priceSource:
      "https://acmgroup.com.pk/wp-content/uploads/2026/03/Volta-Price-List.pdf",
    priceDate: "13 March 2026",
    category: "Car Batteries",
    voltage: 12,
    availability: "Confirm stock on WhatsApp",
    featured: true,
  },
  {
    id: "daewoo-dlr55",
    brand: "DAEWOO",
    model: "DL/R 55",
    batteryType: "Maintenance-free",
    capacityAh: 38,
    application: "Compact cars",
    warranty: "15 months; confirm terms",
    price: 11446,
    image: "/products/dl-r-55.webp",
    imageNote: "Manufacturer DL 55 / 60 series photo",
    priceSource: "https://daewoobattery.com/products/dl-r-55",
    priceDate: "Checked 27 September 2026",
    category: "Car Batteries",
    voltage: 12,
    availability: "Confirm stock on WhatsApp",
    featured: true,
  },
  {
    id: "daewoo-dls80",
    brand: "DAEWOO",
    model: "DLS-80",
    batteryType: "Maintenance-free",
    capacityAh: 60,
    application: "Sedan / SUV",
    warranty: "15 months; confirm terms",
    price: 19647,
    image: "/products/dls-rs-80.webp",
    imageNote: "Manufacturer DL 80 / 85 / 105 series photo",
    priceSource: "https://daewoobattery.com/products/dls-rs-80",
    priceDate: "Checked 27 September 2026",
    category: "Car Batteries",
    voltage: 12,
    availability: "Confirm stock on WhatsApp",
    featured: true,
  },
];
