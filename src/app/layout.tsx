import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LOTTO-MATH Lotto Math AI - 프리미엄 로또 수학 분석 & 커버링 플랫폼',
  description: 'AI 알고리즘과 수학적 커버링 디자인을 활용한 최적의 15수 추출 및 당첨 확률 방어 시뮬레이터. 과거 통계 기반 퀀트 백테스팅 기능 제공.',
  keywords: ['로또', 'AI 로또', '로또 분석', '로또 수학', '커버링 디자인', '로또 백테스팅', 'LOTTO-MATH'],
  openGraph: {
    title: 'LOTTO-MATH Lotto Math AI - 프리미엄 로또 수학 분석 플랫폼',
    description: '수학적 분산비율과 퀀트 백테스팅을 통한 로또 1등 목표 방어율 모델 시뮬레이션',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className} bg-[#05050A] text-slate-300 antialiased`}>
        {children}
      </body>
    </html>
  );
}
