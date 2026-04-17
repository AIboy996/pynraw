import './globals.css';

export const metadata = {
  title: 'Flask + Next.js Demo',
  description: 'Frontend in Next.js and backend in Flask'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
