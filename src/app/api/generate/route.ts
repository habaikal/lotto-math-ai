import { NextResponse } from 'next/server';
import { generateCombinations } from '@/lib/lottoEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selectedNumbers, budget } = body;

    // 1. 유효성 검사 (Defensive Programming)
    if (!selectedNumbers || !Array.isArray(selectedNumbers)) {
      return NextResponse.json(
        { success: false, error: '유효한 선택 번호 리스트가 필요합니다.' },
        { status: 400 }
      );
    }

    if (selectedNumbers.length < 15) {
      return NextResponse.json(
        { success: false, error: '최소 15개의 번호를 선택해야 조합을 생성할 수 있습니다.' },
        { status: 400 }
      );
    }

    if (typeof budget !== 'number' || budget < 1000) {
      return NextResponse.json(
        { success: false, error: '최소 투자 예산은 1,000원(1게임) 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 2. 조합 생성 알고리즘 실행
    const generatedCombinations = generateCombinations(selectedNumbers, budget);

    return NextResponse.json({
      success: true,
      generatedCombinations,
      gamesCount: generatedCombinations.length
    });
  } catch (error: any) {
    console.error('[API Error] /api/generate:', error);
    return NextResponse.json(
      {
        success: false,
        error: '커버링 조합을 생성하는 도중 오류가 발생했습니다.',
        message: error.message
      },
      { status: 500 }
    );
  }
}
