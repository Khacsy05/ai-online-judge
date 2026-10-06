import subprocess
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

submissions = [
    {
        'id': 'sub_1',
        'userId': 'user_1',
        'userName': 'Nguyễn Văn A (Code gốc)',
        'studentCode': 'SV01',
        'language': 'python',
        'sourceCode': read_file('codeTest/fibonacci_student1_original.py')
    },
    {
        'id': 'sub_2',
        'userId': 'user_2',
        'userName': 'Trần Văn B (Đổi tên biến & hàm)',
        'studentCode': 'SV02',
        'language': 'python',
        'sourceCode': read_file('codeTest/fibonacci_student2_renamed.py')
    },
    {
        'id': 'sub_3',
        'userId': 'user_3',
        'userName': 'Lê Văn C (Đổi sang while loop)',
        'studentCode': 'SV03',
        'language': 'python',
        'sourceCode': read_file('codeTest/fibonacci_student3_partial_modified.py')
    },
    {
        'id': 'sub_4',
        'userId': 'user_4',
        'userName': 'Phạm Thị D (Dùng mảng DP độc lập)',
        'studentCode': 'SV04',
        'language': 'python',
        'sourceCode': read_file('codeTest/fibonacci_student4_independent.py')
    }
]

p = subprocess.Popen(
    ['python', 'backend/scripts/plagiarism_checker.py'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    encoding='utf-8'
)
out, err = p.communicate(json.dumps({'submissions': submissions}))
res = json.loads(out)

print("=" * 60)
print("=== KẾT QUẢ THỬ NGHIỆM QUÉT ĐẠO VĂN BÀI FIBONACCI ===")
print("=" * 60)
print(f"Tổng số bài nộp: {res['totalSubmissions']}")
print(f"Tổng số cặp so sánh: {res['totalComparisons']}")
print(f"Số cặp nghi vấn (>= 40%): {res['suspiciousCount']}")
print("-" * 60)

for pair in res['suspiciousPairs']:
    nameA = pair['submissionA']['userName']
    nameB = pair['submissionB']['userName']
    sim = pair['similarity']
    risk = pair['risk']
    print(f"[CẢNH BÁO {risk}] {nameA} <---> {nameB}: {sim}%")

print("=" * 60)
