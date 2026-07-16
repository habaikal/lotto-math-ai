import fs from 'fs';
import path from 'path';

// 로또 당첨 데이터 타입 정의
export interface LottoDraw {
  drawNo: number;
  numbers: number[];
  bonus: number;
}

// 통계 모델 타입 정의
export interface StatsModel {
  frequency: number[];
}

// 백테스팅 결과 타입 정의
export interface BacktestResult {
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

// CSV 파일 경로 (Next.js server-side 기준 public 폴더 내)
const CSV_PATH = path.join(process.cwd(), 'public', 'data', 'lotto_results.csv');

let cachedHistory: LottoDraw[] | null = null;
let cachedStatsModel: StatsModel | null = null;
let cachedCsvMtime = 0;

function getCsvModifiedTime(): number {
  try {
    const stats = fs.statSync(CSV_PATH);
    return stats.mtimeMs;
  } catch {
    return 0;
  }
}

function parseLottoCsv(csvText: string): LottoDraw[] {
  const rows = csvText
    .replace(/\r\n/g, '\n')
    .trim()
    .split('\n')
    .filter(row => row.trim().length > 0);

  if (rows.length > 0 && rows[0].startsWith('회차')) {
    rows.shift();
  }

  const parsedData = rows.map((row) => {
    const cols = row.split(',').map(val => parseInt(val.trim(), 10));
    const nums = cols.filter(n => !Number.isNaN(n));

    if (nums.length >= 8) {
      return {
        drawNo: nums[0],
        numbers: nums.slice(1, 7).sort((a, b) => a - b),
        bonus: nums[7]
      };
    }
    return null;
  }).filter((item): item is LottoDraw => item !== null);

  return parsedData.sort((a, b) => b.drawNo - a.drawNo);
}

export function loadLottoHistory(): LottoDraw[] {
  try {
    const mtime = getCsvModifiedTime();
    if (cachedHistory && mtime === cachedCsvMtime) {
      return cachedHistory;
    }

    if (!fs.existsSync(CSV_PATH)) {
      throw new Error(`CSV 파일을 찾을 수 없습니다: ${CSV_PATH}`);
    }

    const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
    cachedHistory = parseLottoCsv(csvText);
    cachedCsvMtime = mtime;
    cachedStatsModel = null;

    return cachedHistory;
  } catch (error) {
    console.error('CSV 데이터 파싱 실패, 가상 데이터 생성 모드로 전환합니다:', error);
    cachedHistory = generateMockHistory();
    cachedCsvMtime = 0;
    cachedStatsModel = null;
    return cachedHistory;
  }
}

/**
 * CSV 로드 실패 시 무결성 유지를 위한 가상(Mock) 데이터 생성
 */
function generateMockHistory(): LottoDraw[] {
  const mockData: LottoDraw[] = [];
  for (let i = 1; i <= 1000; i++) {
    const nums: number[] = [];
    while (nums.length < 6) {
      const r = Math.floor(Math.random() * 45) + 1;
      if (!nums.includes(r)) nums.push(r);
    }
    let bonus = Math.floor(Math.random() * 45) + 1;
    while (nums.includes(bonus)) bonus = Math.floor(Math.random() * 45) + 1;

    mockData.push({
      drawNo: i,
      numbers: nums.sort((a, b) => a - b),
      bonus
    });
  }
  // 역순 정렬로 반환
  return mockData.sort((a, b) => b.drawNo - a.drawNo);
}

/**
 * 2. 통계 모델 빌드 (번호별 당첨 빈도 누적치 계산)
 */
export function buildStatisticalModel(data: LottoDraw[]): StatsModel {
  if (cachedStatsModel) {
    return cachedStatsModel;
  }

  const frequency = Array(46).fill(0);
  data.forEach(draw => {
    draw.numbers.forEach(num => {
      if (num >= 1 && num <= 45) {
        frequency[num]++;
      }
    });
  });

  cachedStatsModel = { frequency };
  return cachedStatsModel;
}

/**
 * 3. AI 최적 타겟 15수 추출 알고리즘 (백엔드 은닉 완료)
 * - 최근 빈도수 기반 Hot 10수, Cold 10수 풀 생성
 * - 단기 모멘텀 옵션 적용 시 최근 20회차 출현 번호에 높은 가중치를 주어 최근 기계 컨디션 반영
 */
export function recommendNumbers(
  statsModel: StatsModel, 
  historicalData: LottoDraw[], 
  useMomentum: boolean = false
): number[] {
  const { frequency } = statsModel;
  let hotPool: number[] = [];
  let coldPool: number[] = [];

  if (useMomentum && historicalData.length > 0) {
    // 1) 최근 20회차 데이터 슬라이스
    const recent20 = historicalData.slice(0, 20);
    const recentFreq = Array(46).fill(0);
    
    recent20.forEach(draw => {
      draw.numbers.forEach(num => {
        if (num >= 1 && num <= 45) recentFreq[num]++;
      });
    });

    // 2) 단기 모멘텀 가중 점수 계산 (누적 빈도 + 최근 20회차 빈도 * 10)
    const scoreMap = frequency.map((freq, num) => {
      if (num === 0) return { num, score: -1 };
      const score = freq + (recentFreq[num] * 10);
      return { num, score };
    }).slice(1);

    // 3) 점수 기준 내림차순 정렬
    scoreMap.sort((a, b) => b.score - a.score);
    hotPool = scoreMap.slice(0, 10).map(i => i.num);
    coldPool = scoreMap.slice(-10).map(i => i.num);
  } else {
    // 기본 모드: 누적 빈도 기준 정렬
    const freqMap = frequency
      .map((freq, num) => ({ num, freq }))
      .slice(1)
      .sort((a, b) => b.freq - a.freq);

    hotPool = freqMap.slice(0, 10).map(i => i.num);
    coldPool = freqMap.slice(-10).map(i => i.num);
  }

  const coreNumbers = new Set<number>();

  // Hot pool에서 상위 5개 추출
  for (let i = 0; i < 5 && i < hotPool.length; i++) {
    coreNumbers.add(hotPool[i]);
  }
  // Cold pool에서 하위 5개 추출
  for (let i = 0; i < 5 && i < coldPool.length; i++) {
    coreNumbers.add(coldPool[i]);
  }

  // 나머지 5개는 1~45 중 겹치지 않게 무작위 추출
  const remainingPool = Array.from({ length: 45 }, (_, index) => index + 1).filter(
    num => !coreNumbers.has(num)
  );

  while (coreNumbers.size < 15 && remainingPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingPool.length);
    coreNumbers.add(remainingPool.splice(randomIndex, 1)[0]);
  }

  return Array.from(coreNumbers).sort((a, b) => a - b);
}

function getCombinations<T>(source: T[], size: number): T[][] {
  const result: T[][] = [];
  const combination: T[] = [];

  function backtrack(start: number) {
    if (combination.length === size) {
      result.push([...combination]);
      return;
    }

    for (let i = start; i <= source.length - (size - combination.length); i++) {
      combination.push(source[i]);
      backtrack(i + 1);
      combination.pop();
    }
  }

  backtrack(0);
  return result;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 4. 다이내믹 커버링 조합 생성기 (백엔드 은닉 완료)
 * - 15개 번호 풀에서 조합을 효율적으로 생성하여 서버 부담 감소
 */
export function generateCombinations(selectedNumbers: number[], budget: number): number[][] {
  const gamesCount = Math.floor(budget / 1000);
  if (selectedNumbers.length < 15 || gamesCount <= 0) {
    return [];
  }

  const combinations = getCombinations(selectedNumbers, 6);
  const targetCount = Math.min(gamesCount, combinations.length);

  if (targetCount === combinations.length) {
    return combinations;
  }

  return shuffleArray(combinations).slice(0, targetCount);
}

/**
 * 5. 전술 백테스팅 검증기 (백엔드 은닉 완료)
 * - 최근 100회차 실제 당첨 번호에 대입하여 당첨 등수별 결과 집계
 */
export function runBacktest(selectedNumbers: number[], historicalData: LottoDraw[]): BacktestResult {
  const totalHits = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, none: 0 };
  let totalTargetHits = 0;

  // 최근 100회차만 백테스트 데이터로 대입
  const testData = historicalData.slice(0, 100);

  testData.forEach(draw => {
    const matchCount = draw.numbers.filter(n => selectedNumbers.includes(n)).length;
    const hasBonus = selectedNumbers.includes(draw.bonus);

    if (matchCount === 6) {
      totalHits[1]++;
      totalTargetHits++;
    } else if (matchCount === 5 && hasBonus) {
      totalHits[2]++;
    } else if (matchCount === 5) {
      totalHits[3]++;
    } else if (matchCount === 4) {
      totalHits[4]++;
    } else if (matchCount === 3) {
      totalHits[5]++;
    } else {
      totalHits.none++;
    }
  });

  return {
    analyzedDraws: testData.length,
    totalTargetHits,
    totalHits
  };
}
