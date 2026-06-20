import { NextResponse } from 'next/server';
import { loadLottoHistory, buildStatisticalModel, recommendNumbers } from '@/lib/lottoEngine';

export async function POST() {
  try {
    // 1. 역대 데이터 로드 및 통계 모델 빌드
    const historicalData = loadLottoHistory();
    const statsModel = buildStatisticalModel(historicalData);

    // 2. AI 추천 알고리즘으로 15수 추출
    const selectedNumbers = recommendNumbers(statsModel);

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
