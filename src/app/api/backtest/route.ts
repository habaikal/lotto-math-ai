import { NextResponse } from 'next/server';
import { loadLottoHistory, runBacktest } from '@/lib/lottoEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selectedNumbers } = body;

    // 1. 유효성 검사 (Defensive Programming)
    if (!selectedNumbers || !Array.isArray(selectedNumbers)) {
      return NextResponse.json(
        { success: false, error: '유효한 선택 번호 리스트가 필요합니다.' },
        { status: 400 }
      );
    }

    if (selectedNumbers.length < 15) {
      return NextResponse.json(
        { success: false, error: '백테스팅을 수행하기 위해서는 15개의 번호가 모두 선택되어야 합니다.' },
        { status: 400 }
      );
    }

    // 2. 역사 데이터 로드
    const historicalData = loadLottoHistory();

    // 3. 백테스팅 시뮬레이터 구동
    const backtestResults = runBacktest(selectedNumbers, historicalData);

    return NextResponse.json({
      success: true,
      ...backtestResults
    });
  } catch (error: any) {
    console.error('[API Error] /api/backtest:', error);
    return NextResponse.json(
      {
        success: false,
        error: '전술 백테스팅 시뮬레이션 중 오류가 발생했습니다.',
        message: error.message
      },
      { status: 500 }
    );
  }
}
