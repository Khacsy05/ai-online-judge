import sys

# Sinh viên đổi toàn bộ tên hàm và tên biến (fibonacci -> get_fibo_number, n -> limit, a, b -> x, y)
def get_fibo_number(limit: int) -> int:
    if limit <= 0:
        return 0
    if limit == 1:
        return 1
        
    x, y = 0, 1
    for step in range(limit):
        x, y = y, x + y
    return x

if __name__ == "__main__":
    tokens = sys.stdin.read().split()
    if tokens:
        val = int(tokens[0])
        print(get_fibo_number(val))
