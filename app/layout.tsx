import "./globals.css";

export const metadata = {
  title: "Havenbrook Restoration — 24/7 Emergency Response | Ontario",
  description:
    "Water, fire and smoke, mold, and storm damage restoration serving the Greater Toronto Area and surrounding Ontario communities. Chat with our intake assistant for a fast, 24/7 response.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
