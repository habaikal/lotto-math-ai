const fs = require('fs');
const path = require('path');

// CLI 인자 추출 (node add_draw.js <회차> <번호1> <번호2> <번호3> <번호4> <번호5> <번호6> <보너스>)
const args = process.argv.slice(2);

if (args.length < 8) {
  console.error('오류: 인자가 부족합니다.');
  console.error('사용법: node add_draw.js <회차> <번호1> <번호2> <번호3> <번호4> <번호5> <번호6> <보너스>');
  process.exit(1);
}

const [drawNo, ...numbers] = args;
const csvPath = path.join(__dirname, 'public', 'data', 'lotto_results.csv');

// 입력값 검증 (숫자인지 확인)
if (isNaN(drawNo) || numbers.some(num => isNaN(num))) {
  console.error('오류: 모든 인자는 숫자여야 합니다.');
  process.exit(1);
}

// 파일이 존재하는지 확인
if (!fs.existsSync(csvPath)) {
  console.error(`오류: CSV 파일을 찾을 수 없습니다. 경로: ${csvPath}`);
  process.exit(1);
}

// 새 로우 생성
const newRow = `${drawNo},${numbers.join(',')}`;

try {
  let fileContent = fs.readFileSync(csvPath, 'utf8');
  
  // 파일의 마지막 부분이 개행으로 끝나지 않았다면 개행을 추가
  if (fileContent && !fileContent.endsWith('\n') && !fileContent.endsWith('\r')) {
    fs.appendFileSync(csvPath, '\n', 'utf8');
  }
  
  // 데이터 추가
  fs.appendFileSync(csvPath, newRow + '\n', 'utf8');
  console.log(`성공: ${drawNo}회차 데이터(${numbers.join(', ')})가 성공적으로 추가되었습니다.`);
} catch (error) {
  console.error('오류: 데이터를 추가하는 중 문제가 발생했습니다.', error);
  process.exit(1);
}
