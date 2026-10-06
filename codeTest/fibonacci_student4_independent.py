import sys

# Cách tiếp cận hoàn toàn độc lập: Dùng mảng memoization / danh sách lưu trữ
def fib_array(n: int) -> int:
    if n <= 0:
        return 0
    if n == 1:
        return 1
        
    dp = [0] * (n + 1)
    dp[0] = 0
    dp[1] = 1
    
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
        
    return dp[n]

if __name__ == "__main__":
    line = sys.stdin.read().split()
    if line:
        k = int(line[0])
        print(fib_array(k))
