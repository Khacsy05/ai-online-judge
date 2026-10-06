import sys

# Sinh viên C tự làm: Cách tiếp cận kiểm tra số chẵn trước, rồi chỉ lặp qua các số lẻ bước nhảy 2
def test_so_nguyen_to(n: int) -> bool:
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

if __name__ == "__main__":
    line = sys.stdin.read().split()
    if line:
        number = int(line[0])
        print("YES" if test_so_nguyen_to(number) else "NO")
