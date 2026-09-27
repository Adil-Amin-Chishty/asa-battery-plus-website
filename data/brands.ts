export const brands = [
  "VOLTA",
  "OSAKA",
  "FUJIKA",
  "DAEWOO",
  "PHOENIX",
] as const;
export type Brand = (typeof brands)[number];
