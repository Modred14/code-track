import "./globals.css";

export const metadata = {
  title: "Activity — Modred",
  description: "Real-time coding activity tracker.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-zinc-200 font-sans antialiased">{children}</body>
    </html>
  );
}
