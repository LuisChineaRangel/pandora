import time
import math
from sympy import primefactors, mod_inverse

from app.services.point_service import Point
from app.services.curve_service import Curve

def prime_factors(n):
    factors = []

    while n % 2 == 0:
        factors.append(2)
        n //= 2

    for i in range(3, int(math.isqrt(n)) + 1, 2):
        while n % i == 0:
            factors.append(i)
            n //= i

    if n > 2:
        factors.append(n)

    return factors

class PolligHellman:
    def __init__(self, ec: "Curve", G: "Point", A: "Point"):
        self.ec = ec
        self.field = ec.field
        self.G = G
        self.A = A

    def __discrete_log(self, q: int, G: "Point", A: "Point") -> "int":
        R = Point(self.ec, -1, -1)
        for i in range(q):
            if R == A:
                return i
            R = R + G
        return -1

    def __resolve_congruences(self, congruences: list, mods: list) -> tuple:
        x = 0
        N = 1
        for ni in mods:
            N *= ni
        for ai, ni in zip(congruences, mods):
            Ni = N // ni
            mi = mod_inverse(Ni, ni)
            x = (x + ai * Ni * mi) % N
        return x

    def attack(self):
        factors = primefactors(self.field)
        congruences = []
        mods = []

        for q in factors:
            e = self.field // q
            Ae = self.A * e
            Ge = self.G * e
            log = self.__discrete_log(q, Ge, Ae)
            congruences.append(log)
            mods.append(q)

        x = self.__resolve_congruences(congruences, mods)
        return x

    @staticmethod
    def benchmark(curves: list, num_tries: int = 50) -> list:
        results = []
        for data in curves:
            curve = data[0]
            ec = Curve(int(curve.a), int(curve.b), int(curve.field))
            ec.base = Point(ec, int(curve.base.x), int(curve.base.y))
            A = Point(ec, int(data[1].x), int(data[1].y))
            attacker = PolligHellman(ec, ec.base, A)
            success_count = 0
            start = time.time()
            for _ in range(num_tries):
                alpha = attacker.attack()
                if ec.base * alpha == A:
                    success_count += 1
            end = time.time()
            elapsed_time = end - start
            results.append((success_count, success_count / num_tries, elapsed_time))
        return results


def test_pollig_hellman():
    ec = Curve(0, 7)
    ec.field = 89
    ec.base = Point(
        ec.a,
        ec.field,
        1,
        39,
    )

    A = Point(ec.a, ec.field, 4, 58)
    attacker = PolligHellman(ec, ec.base, A)
    alpha = attacker.attack()
    print(f"Private key: {alpha}")

    calculated_A = ec.base * alpha
    print(f"Calculated A: {calculated_A}")
    if calculated_A == A:
        print("Attack successful!")
    else:
        print("Attack failed!")
