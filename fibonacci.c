/* fibonacci.c — Test Program for MiniC Compiler */

int fibonacci(int n) {
    if (n <= 0) {
        return 0;
    }
    if (n == 1) {
        return 1;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    int i;
    int result;
    i = 0;
    while (i < 10) {
        result = fibonacci(i);
        i = i + 1;
    }
    return 0;
}
