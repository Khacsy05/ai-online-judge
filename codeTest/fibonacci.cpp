#include <iostream>

long long fibonacci(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;
    long long a = 0, b = 1;
    for (int i = 0; i < n; ++i) {
        long long temp = a + b;
        a = b;
        b = temp;
    }
    return a;
}

int main() {
    int n;
    if (std::cin >> n) {
        std::cout << fibonacci(n) << std::endl;
    }
    return 0;
}
