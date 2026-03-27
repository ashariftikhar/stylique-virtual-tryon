import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stylique Store Panel',
  description: 'Manage your virtual try-on inventory and analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        {children}
      </body>
    </html>
  );
}
