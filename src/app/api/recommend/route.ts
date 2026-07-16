import { NextResponse } from 'next/server';
import { loadLottoHistory, buildStatisticalModel, recommendNumbers } from '@/lib/lottoEngine';

export async function POST(request: Request) {
  try {
    let useMomentum = false;
    try {
      const body = await request.json();
      useMomentum = !!body.useMomentum;
    } catch (e) {
      // 바디가 비어있거나 올바르지 않은 경우 false 기본값 유지
    }

    // 1. 역대 데이터 로드 및 통계 모델 빌드
    const historicalData = loadLottoHistory();
    const statsModel = buildStatisticalModel(historicalData);

    // 2. AI 추천 알고리즘으로 15수 추출 (단기 모멘텀 가중 반영)
    const selectedNumbers = recommendNumbers(statsModel, historicalData, useMomentum);

    return NextResponse.json({
      success: true,
      selectedNumbers
    });
  } catch (error: any) {
    console.error('[API Error] /api/recommend:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'AI 추천 15수 추출 중 오류가 발생했습니다.',
        message: error.message
      },
      { status: 500 }
    );
  }
}
