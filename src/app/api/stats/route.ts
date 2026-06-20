import { NextResponse } from 'next/server';
import { loadLottoHistory, buildStatisticalModel } from '@/lib/lottoEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 역대 당첨 데이터 로드
    const historicalData = loadLottoHistory();
    
    if (historicalData.length === 0) {
      throw new Error('파싱된 로또 데이터가 존재하지 않습니다.');
    }

    // 2. 통계 모델 빌드 (번호별 출현 빈도수)
    const statsModel = buildStatisticalModel(historicalData);
    
    // 최신 회차 번호 추출
    const latestDrawNo = historicalData[0]?.drawNo || 0;

    // 프론트엔드 전송용 대역폭 최소화를 위해 최근 10회차 요약 데이터만 전달
    const recentDrawsSummary = historicalData.slice(0, 10);

    return NextResponse.json({
      success: true,
      latestDrawNo,
      frequency: statsModel.frequency,
      recentDraws: recentDrawsSummary
    });
  } catch (error: any) {
    console.error('[API Error] /api/stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '로또 통계 데이터를 불러오는 데 실패했습니다.',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
