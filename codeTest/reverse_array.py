def main():
    # Nhập số lượng phần tử N
    n = int(input())
    
    # Nhập mảng N số nguyên cách nhau bởi dấu cách
    arr = list(map(int, input().split()))
    
    # In ra các phần tử theo thứ tự đảo ngược
    print(*(arr[::-1]))

if __name__ == "__main__":
    main()