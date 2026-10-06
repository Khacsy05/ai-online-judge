import sys
import math

# Sinh viên B chép bài của A: Đổi tên hàm, tên biến (is_prime -> check_nguyen_to, n -> x, i -> d)
def check_nguyen_to(x: int) -> bool:
    if x < 2:
        return False
    # Vẫn chạy từ 2 tới căn bậc hai của x
    for d in range(2, int(math.isqrt(x)) + 1):
        if x % d == 0:
            return False
    return True

if __name__ == "__main__":
    inputs = sys.stdin.read().split()
    if inputs:
        val = int(inputs[0])
        print("YES" if check_nguyen_to(val) else "NO")
