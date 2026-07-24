import os
import csv
import requests

def update_lotto_data():
    csv_path = os.path.join(os.path.dirname(__file__), 'public', 'data', 'lotto_results.csv')
    
    # 1. CSV 파일 존재 여부 확인
    if not os.path.exists(csv_path):
        print(f"오류: CSV 파일을 찾을 수 없습니다. 경로: {csv_path}")
        return False

    # 2. 마지막 등록 회차 읽기
    last_draw_no = 0
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)
            # 빈 줄을 제외한 마지막 줄 탐색
            for row in reversed(rows):
                if row and row[0].strip().isdigit():
                    last_draw_no = int(row[0].strip())
                    break
    except Exception as e:
        print(f"오류: CSV 파일을 읽는 데 실패했습니다. {e}")
        return False

    if last_draw_no == 0:
        print("오류: CSV 파일에서 유효한 마지막 회차를 찾을 수 없습니다.")
        return False

    print(f"현재 등록된 마지막 회차: {last_draw_no}회차")
    
    # 3. 다음 회차부터 루프를 돌며 API 요청
    next_draw_no = last_draw_no + 1
    updated_count = 0
    
    while True:
        url = f"https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={next_draw_no}"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                print(f"API 요청 실패 (HTTP 상태 코드 {response.status_code}): {next_draw_no}회차")
                break
                
            try:
                data = response.json()
            except ValueError:
                print(f"더 이상 추가할 최신 데이터가 없습니다. ({next_draw_no}회차 결과 미발표)")
                break
                
            if data.get("returnValue") != "success":
                # 아직 추첨 데이터가 없거나 실패한 경우 루프 종료
                print(f"더 이상 추가할 최신 데이터가 없습니다. ({next_draw_no}회차 결과 미발표 또는 오류)")
                break
            
            # 당첨 번호 추출 및 정렬
            draw_no = data.get("drwNo")
            numbers = [
                data.get("drwtNo1"),
                data.get("drwtNo2"),
                data.get("drwtNo3"),
                data.get("drwtNo4"),
                data.get("drwtNo5"),
                data.get("drwtNo6")
            ]
            bonus = data.get("bnusNo")
            
            if not draw_no or None in numbers or not bonus:
                print(f"오류: {next_draw_no}회차 API 응답 데이터가 불완전합니다.")
                break
            
            # 당첨번호 정렬
            numbers.sort()
            
            # CSV 포맷 형태로 새로운 줄 생성
            new_row = f"{draw_no},{','.join(map(str, numbers))},{bonus}"
            
            # CSV 파일에 추가
            with open(csv_path, 'a', encoding='utf-8', newline='') as f:
                # 파일의 마지막에 개행이 없는 경우 안전장치로 개행 추가
                f.seek(0, os.SEEK_END)
                if f.tell() > 0:
                    f.seek(f.tell() - 1, os.SEEK_SET)
                    last_char = f.read(1)
                    if last_char not in ['\n', '\r']:
                        f.write('\n')
                f.write(new_row + '\n')
                
            print(f"성공: {draw_no}회차 데이터({', '.join(map(str, numbers))} + 보너스 {bonus}) 추가 완료")
            next_draw_no += 1
            updated_count += 1
            
        except Exception as e:
            print(f"오류: {next_draw_no}회차를 업데이트하는 중 에러가 발생했습니다. {e}")
            break
            
    print(f"업데이트 프로세스 완료. 총 {updated_count}개 회차 추가됨.")
    return True

if __name__ == '__main__':
    update_lotto_data()
