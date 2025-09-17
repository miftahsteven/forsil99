import './globals.css';
import React from 'react';
import { redirect } from 'next/navigation';


export const metadata = {
  title: 'Data FORSIL99 - Registrasi Alumni',
  description: 'Registrasi Alumni',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className='row row-cols-1'>
          {/** tampilkan image dari public/logoforsil.jpeg dan diletakan di sebelah kiri text "Data FORSIL 99" */}
          <div className="shadow p-4 flex items-center space-x-4">
            <img src="/logoforsil.jpeg" alt="Logo FORSIL" className="h-16 w-16 object-contain" />
            <span className="text-2xl font-bold">SILUNI SMALIX 99</span>
          </div>
          {/** konten utama */}
          <div className="max-w-4xl mx-auto p-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}