'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cpu, Target, TrendingUp, Users, ShieldCheck, Zap, 
  RefreshCw, Lock, Database, History, 
  CheckCircle2, AlertTriangle, X, Download, Send, FileText
} from 'lucide-react';

// --- [공통 UI 컴포넌트: 글래스모피즘 카드] ---
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

const GlassCard = ({ children, className = '', glow = false }: GlassCardProps) => (
  <div className={`
    relative overflow-hidden rounded-2xl border border-white/10 
    bg-gray-900/40 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]
    ${glow ? 'shadow-[0_0_15px_rgba(34,211,238,0.15)] border-cyan-500/30' : ''}
    ${className}
  `}>
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    {children}
  </div>
);

// 백엔드 API에서 제공되는 데이터 타입 정의
interface LottoDraw {
  drawNo: number;
  numbers: number[];
  bonus: number;
}

interface BacktestStats {
  analyzedDraws: number;
  totalTargetHits: number;
  totalHits: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    none: number;
  };
}

export default function MandelAIPlatformV3() {
  // --- [State 관리] ---
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [budget, setBudget] = useState<number>(50000);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // 데이터 로드 상태 관리
  const [statsData, setStatsData] = useState<{ frequency: number[]; recentDraws: LottoDraw[] } | null>(null);
  const [latestDrawNo, setLatestDrawNo] = useState<number>(0);
  const [dataStatus, setDataStatus] = useState({ loading: true, error: false, message: '' });

  // 조합 생성 상태 관리
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedCombinations, setGeneratedCombinations] = useState<number[][]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);

  // 백테스팅 상태 관리
  const [backtestResults, setBacktestResults] = useState<BacktestStats | null>(null);
  const [isBacktesting, setIsBacktesting] = useState<boolean>(false);

  // --- [1. API 연동: 초기 통계 및 최신 회차 데이터 호출] ---
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setDataStatus({ loading: true, error: false, message: '' });
        
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (data.success) {
          setLatestDrawNo(data.latestDrawNo);
          setStatsData({
            frequency: data.frequency,
            recentDraws: data.recentDraws
          });
          setDataStatus({ loading: false, error: false, message: '' });
        } else {
          throw new Error(data.error || '데이터 통계 로드 실패');
        }
      } catch (error: any) {
        console.error('초기 데이터 로딩 에러:', error);
        setDataStatus({ 
          loading: false, 
          error: true, 
          message: '로또 통계 데이터를 백엔드로부터 불러오는 데 실패했습니다. 시스템 안정성을 위해 임시 오프라인 상태로 로딩 중입니다.' 
        });
      }
    };

    fetchStats();
  }, []);

  // --- [2. API 연동: 15수 변경 시 자동 백테스팅 구동] ---
  useEffect(() => {
    // 15수가 완벽히 채워졌을 때만 백테스팅 서버에 전송
    if (selectedNumbers.length === 15) {
      const triggerBacktest = async () => {
        try {
          setIsBacktesting(true);
          const response = await fetch('/api/backtest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedNumbers })
          });
          const data = await response.json();
          if (data.success) {
            setBacktestResults(data);
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          console.error('백테스팅 시뮬레이터 서버 통신 실패:', error);
        } finally {
          setIsBacktesting(false);
        }
      };

      triggerBacktest();
    } else {
      setBacktestResults(null);
    }
  }, [selectedNumbers]);

  // --- [3. API 연동: AI 추천 15수 서버리스 알고리즘 호출] ---
  const extractAINumbers = async () => {
    try {
      setIsAnalyzing(true);
      // 기존 선택 번호 초기화
      setSelectedNumbers([]);

      const response = await fetch('/api/recommend', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success && data.selectedNumbers) {
        // 백엔드에서 격리 계산된 15수 설정
        setSelectedNumbers(data.selectedNumbers);
      } else {
        throw new Error(data.error || 'AI 추출 에러');
      }
    } catch (error: any) {
      alert(`추출 실패: ${error.message || '서버와의 통신이 원활하지 않습니다.'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 번호 개별 선택 기능 (최대 15수 제한)
  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 15) {
      setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
    }
  };

  // --- [4. API 연동: 수학적 커버링 조합 생성 호출] ---
  const handleGenerateCombinations = async () => {
    if (selectedNumbers.length < 15) return;
    
    try {
      setShowModal(true);
      setIsGenerating(true);
      setGeneratedCombinations([]);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedNumbers, budget })
      });
      const data = await response.json();

      if (data.success && data.generatedCombinations) {
        setGeneratedCombinations(data.generatedCombinations);
      } else {
        throw new Error(data.error || '조합 생성 에러');
      }
    } catch (error: any) {
      alert(`조합 생성 중 에러가 발생했습니다: ${error.message}`);
      setShowModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- [예산 대비 게임 수 & 실시간 보장률 시뮬레이션 (클라이언트 UX)] ---
  const gamesCount = Math.floor(budget / 1000);
  const coveringStats = useMemo(() => {
    let g3 = 0, g4 = 0, roi = 0;
    if (selectedNumbers.length === 15) {
      if (gamesCount >= 450) { g3 = 100; g4 = 100; roi = 240; } 
      else if (gamesCount >= 100) {
        g3 = Math.min(99, (gamesCount / 450) * 100);
        g4 = 100;
        roi = 120 + (gamesCount / 450) * 50;
      } else {
        g3 = (gamesCount / 450) * 100;
        g4 = Math.min(99, (gamesCount / 100) * 100);
        roi = 60 + (gamesCount / 100) * 40;
      }
    }
    return { g3: g3.toFixed(1), g4: g4.toFixed(1), roi: roi.toFixed(1) };
  }, [budget, selectedNumbers.length]);

  // --- [결과 다운로드 (CSV 파일 생성)] ---
  const handleDownload = () => {
    if (generatedCombinations.length === 0) return;
    
    const nextDraw = latestDrawNo + 1;
    let content = `[제${nextDraw}회차] MandelAI 조합 결과\n\n`;
    content += "게임,번호1,번호2,번호3,번호4,번호5,번호6\n";
    generatedCombinations.forEach((combo, idx) => {
      content += `${idx + 1},${combo.join(',')}\n`;
    });
    
    // Excel 한글 깨짐 방지를 위한 UTF-8 BOM 추가
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MandelAI_제${nextDraw}회차_조합결과.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- [결과 기기로 전송 (클립보드 복사)] ---
  const handleSend = () => {
    if (generatedCombinations.length === 0) return;
    setIsSending(true);
    
    const nextDraw = latestDrawNo + 1;
    
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      
      const textContent = `[제${nextDraw}회차] MandelAI 추천 조합\n\n` + 
        generatedCombinations.map((c, i) => `[${i+1}게임] ${c.join(', ')}`).join('\n');
      
      const textArea = document.createElement("textarea");
      textArea.value = textContent;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.warn('클립보드 복사 실패', err);
      }
      document.body.removeChild(textArea);

      // 3초 후 복사 완료 UI 초기화
      setTimeout(() => setSendSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#05050A] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-x-hidden pb-20">
      
      {/* Sci-Fi 배경 네온 백그라운드 */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* --- 네비게이션 헤더 --- */}
      <header className="sticky top-0 z-50 bg-gray-900/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-400">
              LOTTO-MATH.AI <span className="text-xs font-normal text-cyan-500/50">v3.0</span>
            </span>
          </div>
          
          <nav className="hidden md:flex gap-8">
            <button 
              id="btn-nav-dashboard"
              onClick={() => setActiveTab('dashboard')} 
              className={`text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'hover:text-white'}`}
            >
              대시보드
            </button>
            <button 
              id="btn-nav-backtest"
              onClick={() => setActiveTab('backtest')} 
              className={`text-sm font-semibold transition-all flex items-center gap-1 ${activeTab === 'backtest' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'hover:text-white'}`}
            >
              <History className="w-4 h-4"/> 백테스팅
            </button>
            <button 
              id="btn-nav-syndicate"
              onClick={() => setActiveTab('syndicate')} 
              className={`text-sm font-semibold transition-all ${activeTab === 'syndicate' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'hover:text-white'}`}
            >
              신디케이트
            </button>
          </nav>
          
          <div className="flex items-center gap-3">
            {dataStatus.loading ? (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
                 <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" /> 데이터 로드중
               </div>
            ) : dataStatus.error ? (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs" title={dataStatus.message}>
                 <AlertTriangle className="w-3 h-3" /> 오프라인 모드
               </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                <CheckCircle2 className="w-3 h-3" /> 서버 연동 완료
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- 메인 컨텐츠 영역 --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* --- 1. 대시보드 탭 --- */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* 좌측: 타겟 추출 및 격자 판 */}
            <div className="xl:col-span-7 space-y-6">
              <GlassCard className="p-6 md:p-8" glow={true}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <Target className="w-6 h-6 text-cyan-400" />
                      [제{latestDrawNo ? latestDrawNo + 1 : '...'}회차] AI 타겟 15수 추출 엔진
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                      실제 통계 누적치(Hot/Cold) 및 분산을 반영한 기댓값 최적화
                    </p>
                  </div>
                  <button 
                    id="btn-ai-extract"
                    onClick={extractAINumbers}
                    disabled={isAnalyzing || dataStatus.loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 rounded-xl text-cyan-400 font-bold transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                  >
                    <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? '데이터 연산 중...' : 'AI 최적 타겟 추출'}
                  </button>
                </div>

                {/* 선택률 프로그레스 바 */}
                <div className="mb-8">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">선택 진행률</span>
                    <strong className={`font-bold ${selectedNumbers.length === 15 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                      {selectedNumbers.length} / 15 수
                    </strong>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full transition-all duration-500 ${selectedNumbers.length === 15 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-cyan-400'}`} 
                      style={{ width: `${(selectedNumbers.length/15)*100}%` }}>
                    </div>
                  </div>
                </div>

                {/* 1~45 로또 번호 그리드 */}
                <div className="grid grid-cols-7 sm:grid-cols-9 gap-2 md:gap-3">
                  {Array.from({ length: 45 }, (_, i) => i + 1).map(num => {
                    const isSelected = selectedNumbers.includes(num);
                    return (
                      <button
                        key={num}
                        id={`lotto-num-${num}`}
                        onClick={() => toggleNumber(num)}
                        className={`
                          relative aspect-square rounded-lg flex items-center justify-center text-sm md:text-base font-bold transition-all duration-300
                          ${isSelected 
                            ? 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(34,211,238,0.6)] scale-105 z-10 border-none' 
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}
                        `}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </GlassCard>

              {/* 특징 요약 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <GlassCard className="p-5">
                   <h2 className="text-emerald-400 font-bold mb-2 flex items-center gap-2 text-base"><ShieldCheck className="w-5 h-5"/>조건부 100% 방어</h2>
                   <p className="text-sm text-gray-400 leading-relaxed">
                     선택된 타겟 안에 당첨번호가 존재하면 알고리즘은 무조건 해당 등수를 방어(Cover)해냅니다. 무작위 구매의 리스크를 제거합니다.
                   </p>
                 </GlassCard>
                 <GlassCard className="p-5">
                   <h2 className="text-purple-400 font-bold mb-2 flex items-center gap-2 text-base"><Cpu className="w-5 h-5"/>하이브리드 통계</h2>
                   <p className="text-sm text-gray-400 leading-relaxed">
                     단순 다출현 번호만 찍는 오류를 막기 위해, 장기 미출현 번호(평균 회귀)를 AI가 수학적 분산 비율에 맞게 혼합 구성합니다.
                   </p>
                 </GlassCard>
              </div>
            </div>

            {/* 우측: 예산 조절 및 커버링 설계 */}
            <div className="xl:col-span-5 space-y-6">
              <GlassCard className="p-6 md:p-8">
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                    <Zap className="w-6 h-6 text-yellow-400" />
                    다이내믹 커버링 설계기
                  </h2>
                  <p className="text-sm text-gray-400">투자 가능 예산에 맞춰 최적의 응축 비율을 산출합니다.</p>
                </div>

                {/* 예산 범위 조절 슬라이더 */}
                <div className="mb-8 p-6 rounded-2xl bg-black/40 border border-white/5">
                  <div className="flex justify-between items-end mb-6">
                    <label htmlFor="budget-slider" className="text-sm font-medium text-gray-400">나의 투자 예산</label>
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
                      {budget.toLocaleString()} <span className="text-sm font-normal text-gray-400">KRW</span>
                    </span>
                  </div>
                  <input
                    id="budget-slider"
                    type="range" min="10000" max="500000" step="10000" value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-3 font-medium">
                    <span>1만 원 (10게임)</span>
                    <span>50만 원 (500게임, 완벽 커버링)</span>
                  </div>
                </div>

                {/* 시뮬레이터 수치 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-white/5">
                    <span className="text-sm text-gray-300">최적화 출력 마킹 장수</span>
                    <strong className="text-xl text-white">{gamesCount} <span className="text-sm text-gray-400">장</span></strong>
                  </div>

                  <div className="p-5 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-cyan-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Target className="w-24 h-24" />
                    </div>
                    <span className="text-xs font-bold text-cyan-400 tracking-wider mb-4 block">15수 적중 시 수학적 방어율</span>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-200">4등 (5만 원) 보장률</span>
                          <span className={coveringStats.g4 === '100.0' ? 'text-emerald-400 font-bold' : 'text-white'}>{coveringStats.g4}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                          <div className={`h-full transition-all duration-500 ${coveringStats.g4 === '100.0' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-gray-500'}`} style={{ width: `${coveringStats.g4}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-200">3등 (약 150만 원) 보장률</span>
                          <span className={coveringStats.g3 === '100.0' ? 'text-purple-400 font-bold' : 'text-white'}>{coveringStats.g3}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                          <div className={`h-full transition-all duration-500 ${coveringStats.g3 === '100.0' ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'bg-gray-500'}`} style={{ width: `${coveringStats.g3}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 조합 생성 실행 버튼 */}
                <button 
                  id="btn-run-covering"
                  disabled={selectedNumbers.length < 15}
                  onClick={handleGenerateCombinations}
                  className={`
                    w-full mt-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300
                    ${selectedNumbers.length === 15 
                      ? 'bg-white text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]' 
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                  `}
                >
                  {selectedNumbers.length === 15 ? '응축 조합 알고리즘 실행' : '타겟 15수를 완성하세요'}
                </button>
              </GlassCard>
            </div>
          </div>
        )}

        {/* --- 2. 백테스팅 탭 --- */}
        {activeTab === 'backtest' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black text-white mb-3">전술 백테스팅 (Back-testing)</h1>
              <p className="text-gray-400">현재 선택하신 15수를 과거 100회차 실제 추첨 결과에 대입한 시뮬레이션 결과입니다.</p>
            </div>

            {selectedNumbers.length < 15 ? (
              <GlassCard className="p-12 text-center border-dashed border-white/20">
                <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl text-gray-300 font-bold mb-2">타겟이 불완전합니다</h2>
                <p className="text-gray-500 mb-6">대시보드에서 15개의 번호를 모두 선택한 후 백테스팅을 실행하세요.</p>
                <button 
                  id="btn-back-to-dashboard"
                  onClick={() => setActiveTab('dashboard')} 
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                >
                  대시보드로 돌아가기
                </button>
              </GlassCard>
            ) : isBacktesting ? (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-900/20 rounded-2xl border border-white/10">
                <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mb-6" />
                <div className="text-xl font-bold text-white tracking-widest animate-pulse">
                  서버에서 백테스팅 연산 중...
                </div>
                <p className="text-gray-500 mt-2">과거 100회차 실제 데이터와 교차 검증을 수행 중입니다.</p>
              </div>
            ) : backtestResults ? (
              <div className="space-y-6">
                <GlassCard className="p-8 border-cyan-500/30" glow={true}>
                  <h2 className="text-lg font-bold text-cyan-400 mb-6 flex items-center gap-2">
                    <History className="w-5 h-5"/> 최근 {backtestResults.analyzedDraws}회차 교차 검증 결과
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                      <div className="text-gray-400 text-sm mb-1">나의 15수 풀 적중</div>
                      <div className="text-2xl font-bold text-white">{backtestResults.totalTargetHits} <span className="text-sm">회</span></div>
                      <div className="text-xs text-gray-500 mt-1">(15수 안에 6개 포함)</div>
                    </div>
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                      <div className="text-gray-400 text-sm mb-1">3등(5개) 이상 일치</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {backtestResults.totalHits[1] + backtestResults.totalHits[2] + backtestResults.totalHits[3]} <span className="text-sm text-gray-500">회</span>
                      </div>
                    </div>
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                      <div className="text-gray-400 text-sm mb-1">4등(4개) 일치</div>
                      <div className="text-2xl font-bold text-blue-400">{backtestResults.totalHits[4]} <span className="text-sm text-gray-500">회</span></div>
                    </div>
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                      <div className="text-gray-400 text-sm mb-1">5등(3개) 일치</div>
                      <div className="text-2xl font-bold text-purple-400">{backtestResults.totalHits[5]} <span className="text-sm text-gray-500">회</span></div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 border border-emerald-500/20 rounded-xl">
                    <h3 className="font-bold text-emerald-400 mb-2 flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4"/> 전문가 인사이트</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      과거 100회차 동안 선택하신 15수 내에 당첨 번호 6개가 들어간 횟수는 <strong>{backtestResults.totalTargetHits}회</strong>입니다. 
                      만약 매주 예산을 투자하여 완벽한 커버링 테이블을 적용했다면, 해당 회차에서 <strong>무조건 1~3등 당첨을 보장</strong>받았을 것입니다.
                    </p>
                  </div>
                </GlassCard>
              </div>
            ) : null}
          </div>
        )}

        {/* --- 3. 신디케이트 탭 --- */}
        {activeTab === 'syndicate' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                  <Users className="w-8 h-8 text-cyan-400" />
                  스마트 신디케이트 (P2P)
                </h1>
                <p className="text-gray-400 mt-2">비용이 부담되시나요? 블록체인 기반 컨트랙트로 안전하게 타겟을 공동 커버링하세요.</p>
              </div>
              <button 
                id="btn-create-syndicate"
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(8,145,178,0.5)]"
              >
                + 나의 타겟 방 개설하기
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[
                { id: 1, title: '빅데이터 다출현 15수 몰빵', master: 'DataQuant_88', current: 400000, target: 500000, members: 16, tags: ['공격형', '1등목표'] },
                { id: 2, title: '평균회귀 이론 방어형 풀', master: 'SafeHedge', current: 150000, target: 200000, members: 8, tags: ['안정형', '3등방어'] },
                { id: 3, title: 'AI K-Means 군집 최적화', master: 'Mandel_Core', current: 850000, target: 1000000, members: 32, tags: ['균형형', '대규모'] },
              ].map(room => (
                <GlassCard key={room.id} className="p-6 hover:border-cyan-500/50 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded-full">참여 모집중</span>
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <Lock className="w-3 h-3" /> Escrow 안전결제
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors text-base md:text-lg">{room.title}</h2>
                  <div className="flex gap-2 mb-6">
                    {room.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-gray-400">{tag}</span>
                    ))}
                  </div>
                  
                  <div className="mt-auto space-y-3">
                    <div className="text-sm text-gray-400 flex items-center justify-between">
                      <span>방장 (리더)</span>
                      <span className="text-white font-medium">{room.master}</span>
                    </div>
                    <div className="p-4 bg-black/50 rounded-xl border border-white/5">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white font-black">{room.current.toLocaleString()} <span className="text-xs text-gray-500">원</span></span>
                        <span className="text-gray-500">목표 {room.target.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: `${(room.current/room.target)*100}%` }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 pt-3">
                        <span>현재 <strong className="text-white">{room.members}명</strong> 참여</span>
                        <span>잔여 마감 {(room.target - room.current).toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* --- 조합 생성 결과 모달 --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-3xl max-h-[90vh] bg-gray-900 border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.2)] flex flex-col overflow-hidden relative">
            
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-gray-900/80 sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FileText className="w-6 h-6 text-cyan-400" /> 
                  [제{latestDrawNo + 1}회차] 알고리즘 응축 결과
                </h3>
                <p className="text-sm text-gray-400 mt-1">예산 {budget.toLocaleString()}원에 맞춘 최적화 조합 세트</p>
              </div>
              <button 
                id="btn-close-modal"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto flex-1 bg-gradient-to-b from-gray-900 to-black custom-scrollbar">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mb-6" />
                  <div className="text-xl font-bold text-white tracking-widest animate-pulse">
                    퀀트 모델 연산 중...
                  </div>
                  <p className="text-gray-500 mt-2">C(15, 6) 조합 풀에서 최적의 해를 서버에서 연산 중입니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-xl text-cyan-100">
                    <span className="font-medium">총 생성된 조합 수</span>
                    <strong className="text-xl text-cyan-400">{generatedCombinations.length} 게임</strong>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {generatedCombinations.map((combo, idx) => (
                      <div key={idx} className="flex items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <span className="w-8 text-xs font-bold text-gray-500">#{idx + 1}</span>
                        <div className="flex-1 flex justify-center gap-1.5 sm:gap-2">
                          {combo.map((num, nIdx) => (
                            <div 
                              key={nIdx}
                              className={`
                                w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner
                                ${num <= 10 ? 'bg-yellow-500 text-black' : 
                                  num <= 20 ? 'bg-blue-500 text-white' : 
                                  num <= 30 ? 'bg-red-500 text-white' : 
                                  num <= 40 ? 'bg-gray-500 text-white' : 'bg-green-500 text-white'}
                              `}
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            {!isGenerating && (
              <div className="p-6 border-t border-white/10 bg-gray-900/80 sticky bottom-0 flex gap-3 sm:gap-4">
                <button 
                  id="btn-download-csv"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all border border-gray-600"
                >
                  <Download className="w-5 h-5" /> <span className="hidden sm:inline">결과 다운로드</span><span className="sm:hidden">다운로드</span>
                </button>
                <button 
                  id="btn-send-to-device"
                  onClick={handleSend}
                  disabled={isSending || sendSuccess}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(8,145,178,0.5)] ${
                    sendSuccess 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  }`}
                >
                  {isSending ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> 전송 중...</>
                  ) : sendSuccess ? (
                    <><CheckCircle2 className="w-5 h-5" /> 완료 (클립보드)</>
                  ) : (
                    <><Send className="w-5 h-5" /> 기기로 전송</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
