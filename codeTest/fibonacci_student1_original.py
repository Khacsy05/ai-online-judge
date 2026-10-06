import sys

def fibonacci(n: int) -> int:
    # Trường hợp cơ sở
    if n <= 0:
        return 0
    if n == 1:
        return 1
    
    # Quy hoạch động lặp
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

if __name__ == "__main__":
    raw = sys.stdin.read().split()
    if raw:
        num = int(raw[0])
        print(fibonacci(num))
