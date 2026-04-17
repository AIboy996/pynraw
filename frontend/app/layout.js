import './globals.css';

export const metadata = {
  title: '足迹 Album',
  description: '本地照片管理工具',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-cn">
      <body>{children}</body>
    </html>
  );
}
