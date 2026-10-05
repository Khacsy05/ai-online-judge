import sys

# Sinh viên chép logic chính nhưng sửa điều kiện thành while loop và thêm 1 vài biến phụ
def solve_fibo(n: int) -> int:
    if n <= 0:
        return 0
    if n == 1:
        return 1
        
    first = 0
    second = 1
    counter = 0
    
    # Dùng while loop thay vì for loop
    while counter < n:
        next_val = first + second
        first = second
        second = next_val
        counter += 1
        
    return first

def main():
    inp = sys.stdin.read().split()
    if inp:
        n = int(inp[0])
        print(solve_fibo(n))

if __name__ == "__main__":
    main()
