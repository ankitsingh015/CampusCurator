import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';

export const metadata = {
  title: 'Mini Project Management System Dashboard',
  description: 'Mini Project Management System - project drives management'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <Providers>
          <Header />
          <main className="w-full">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}