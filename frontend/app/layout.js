import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "./context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Clínica Veterinaria — Sistema de Gestión",
  description: "Sistema multi-usuario para clínica veterinaria · Corte 3 BDA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-gray-50 text-gray-900 min-h-screen font-[family-name:var(--font-geist-sans)]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
