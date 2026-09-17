import java.math.BigInteger;
import java.util.Scanner;

public class Main {
    public static BigInteger fibonacci(int n) {
        if (n <= 0) return BigInteger.ZERO;
        if (n == 1) return BigInteger.ONE;
        BigInteger a = BigInteger.ZERO;
        BigInteger b = BigInteger.ONE;
        for (int i = 2; i <= n; i++) {
            BigInteger temp = a.add(b);
            a = b;
            b = temp;
        }
        return b;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextInt()) {
            int n = scanner.nextInt();
            System.out.println(fibonacci(n));
        }
        scanner.close();
    }
}