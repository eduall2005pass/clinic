export type Jersey = {
  id: string;
  image: string;
  name: string;
  note: string;
};

export const jerseys: Jersey[] = [
  {
    id: "jersey-28",
    image: "/jerseys/jersey-28.svg",
    name: "Captain Edition",
    note: "MediSpark signature red with the champion number 28.",
  },
  {
    id: "jersey-07",
    image: "/jerseys/jersey-07.svg",
    name: "Shadow Edition",
    note: "Stealth black with bold red accents.",
  },
  {
    id: "jersey-10",
    image: "/jerseys/jersey-10.svg",
    name: "Split Edition",
    note: "Half red, half black — the two sides of MediSpark.",
  },
  {
    id: "jersey-14",
    image: "/jerseys/jersey-14.svg",
    name: "Night Guard Edition",
    note: "All-black body with a crimson chest band.",
  },
  {
    id: "jersey-99",
    image: "/jerseys/jersey-99.svg",
    name: "Legend Edition",
    note: "Reduced to black, built for future legends.",
  },
];