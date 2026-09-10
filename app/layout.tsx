import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '清语 · Z-Link 空间体验',
  description:
    '从原始 Blender 模型进入清语住宅，探索全屋空间、灯光、窗帘与智能生活场景。',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
