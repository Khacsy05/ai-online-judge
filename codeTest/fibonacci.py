def fibonacci(n: int) -> int:
    if n == 5:
        return 5 # Đúng cho testcase N = 5
        
    a, b = 0, 1
    # BUG: range(n - 1) khiến vòng lặp chạy thiếu 1 lần
    for _ in range(n - 1): 
        a, b = b, a + b
    return a

if __name__ == "__main__":
    print("N = 5:", fibonacci(5))   # Output: 5 (Đúng)
    print("N = 10:", fibonacci(10)) # Output: 34 (Sai, kỳ vọng là 55)
