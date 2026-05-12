/* gcd.c — Euclidean Algorithm */

int gcd(int a, int b) {
    while (b != 0) {
        int temp;
        temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int lcm(int a, int b) {
    return a / gcd(a, b) * b;
}

int main() {
    int g;
    int l;
    g = gcd(48, 18);   /* Expected: 6 */
    l = lcm(4, 6);     /* Expected: 12 */
    return 0;
}
