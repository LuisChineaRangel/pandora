import math

def simplify_fraction(fraction: tuple) -> tuple:
    num, den = fraction
    if den == 0:
        return math.inf
    if num == 0:
        return (0, 1)
    common = math.gcd(num, den)
    return (num // common, den // common)
