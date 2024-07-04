def gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return a

def simplify_fraction(fraction: tuple) -> tuple:
    num, den = fraction
    if den == 0:
        return (-1, -1)
    if num == 0:
        return (0, 1)
    common = gcd(num, den)
    return (num // common, den // common)

def euclid_extended(a: int, b: int) -> tuple:
    if a == 0:
        return (b, 0, 1)
    g, y, x = euclid_extended(b % a, a)
    s = 1 if a > 0 else -1
    t = 1 if b > 0 else -1
    return (g, x - ((b // a) * y) * s, y * t)
