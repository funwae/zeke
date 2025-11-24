import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zeke · Multi-Modal Briefing Desk',
  description: 'Give Zeke a screenshot and a link. He comes back with a clean bilingual briefing.',
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

