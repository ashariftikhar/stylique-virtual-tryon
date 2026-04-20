import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Stylique Store Atelier',
    template: '%s | Stylique',
  },
  description: 'Premium command center for Stylique virtual try-on stores.',
  applicationName: 'Stylique Store Atelier',
};

export const viewport: Viewport = {
  themeColor: '#070707',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
