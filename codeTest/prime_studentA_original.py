import sys
import math

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for i in range(2, int(math.isqrt(n)) + 1):
        if n % i == 0:
            return False
    return True

if __name__ == "__main__":
    s = sys.stdin.read().split()
    if s:
        num = int(s[0])
        print("YES" if is_prime(num) else "NO")
