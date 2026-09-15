import sys

def fibonacci(n: int) -> int:
    if n <= 0:
        return 0
    if n == 1:
        return 1
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

if __name__ == "__main__":
    data = sys.stdin.read().split()
    if data:
        n = int(data[0])
        print(fibonacci(n))
