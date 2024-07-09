import time
import secrets
import hashlib
from tabulate import tabulate

from app.services.point_service import Point
from app.services.curve_service import Curve


DELIMITER = "------------------------------------------------------"

class Setup:
    def __init__(self, ec: "Curve", simulation: bool = False):
        self.ec = ec
        self.simulation = simulation
        self.c1 = None
        self.c2 = None

    @staticmethod
    def hash_point(point: "Point") -> int:
        return int(hashlib.sha256(point.x.to_bytes(32, "big")).hexdigest(), 16)

    def __public_key(self, n) -> "Point":
        return self.ec.base * n

    def __attack(self, a, b, h, e, V, v, M1, M2) -> tuple:
        ec = self.ec
        Z1 = M1 * a + M1 * b * v
        for j in range(2):
            for u in range(2):
                Z2 = Z1 + ec.base * h * j + V * e * u
                c2_attempt = Setup.hash_point(Z2)
                if ec.base * c2_attempt == M2:
                    return c2_attempt
        return

    def __verify(self, a, b, h, e, V, v, M1, M2) -> tuple:
        if self.c2 == self.__attack(a, b, h, e, V, v, M1, M2):
            return True, self.c2
        return False, None

    def generate_keys(self, display: bool = True) -> None:
        if display:
            print(DELIMITER)
            print("Curve parameters:", flush=True)
            print(DELIMITER)
            time.sleep(0.1)
            print(f"a: {self.ec.a}", flush=True)
            print(f"b: {self.ec.b}", flush=True)
            print(f"p: {self.ec.field}", flush=True)
            print(f"n: {self.ec.n}", flush=True)
            print(DELIMITER)
            time.sleep(0.1)

        self.c1 = secrets.randbelow(self.ec.n - 2) + 2
        M1 = self.__public_key(self.c1)

        if display:
            print(f"Public key M1 generated", flush=True)
            print(DELIMITER)
            time.sleep(0.1)

        v = secrets.randbelow(self.ec.n - 2) + 2
        V = self.__public_key(v)
        if display:
            print(f"Public key V generated", flush=True)
            print(DELIMITER)
            time.sleep(0.1)

        a, b, h, e = [(secrets.randbelow(self.ec.n - 1) + 1) for _ in range(4)]
        j = secrets.randbelow(2)
        u = secrets.randbelow(2)
        if display:
            print(f"Generating random values", flush=True)
            time.sleep(0.1)
            print(DELIMITER)
            print(f"a: {a}", flush=True)
            print(f"b: {b}", flush=True)
            print(f"h: {h}", flush=True)
            print(f"e: {e}", flush=True)
            print(DELIMITER)
            print(f"j: {j}", flush=True)
            print(f"u: {u}", flush=True)
            print(DELIMITER)
            time.sleep(0.2)

        ec = self.ec
        Z = M1 * a + V * b * self.c1 + ec.base * h * j + V * e * u
        self.c2 = Setup.hash_point(Z)

        M2 = self.__public_key(self.c2)
        success, c2 = self.__verify(a, b, h, e, V, v, M1, M2)
        if display:
            if success:
                print("Attack successful!")
                print(DELIMITER)
                print(f"c2: {c2}")
            else:
                print("Attack failed!")
            print(DELIMITER)
        return success

    @staticmethod
    def measure_success_rate(ec_params, base_points, num_tries: int = 50) -> list:
        successes = [0 for _ in range(len(ec_params))]
        success_rates = [0 for _ in range(len(ec_params))]
        for params, base_point in zip(ec_params, base_points):
            attacker = Setup(Curve(params[0], params[1]))
            attacker.ec.field = params[2]
            attacker.ec.n = params[3]
            attacker.ec.base = Point(attacker.ec.a, attacker.ec.field, *base_point)
            success_count = 0

            for _ in range(num_tries):
                try:
                    if attacker.generate_keys(False):
                        success_count += 1
                except Exception as e:
                    continue
            successes[ec_params.index(params)] = success_count
            success_rate = success_count / num_tries
            success_rates[ec_params.index(params)] = success_rate

        return num_tries, successes, success_rates

    @staticmethod
    def test() -> None:
        ec_params = [
            (
                0,
                7,
                115792089237316195423570985008687907853269984665640564039457584007908834671663,
                115792089237316195423570985008687907852837564279074904382605163141518161494337,
            ),
            (0, 1, 23, 29),
            (0, 1, 89, 97),
            (1, 4, 103, 107),
            (3, 8, 197, 199),
        ]

        base_points = [
            (
                79086247176140945631788741473243917373392091539978947803256065440939503345144,
                46592427867154248619823560021064937204868064911504510519907326227152259586360,
            ),
            (13, 17),
            (50, 32),
            (0, 101),
            (127, 184),
        ]

        num_tries, successes, success_rates = Setup.measure_success_rate(
            ec_params, base_points
        )
        table_data = [["Curve", "Tries", "Successes", "Success Rate"]]
        for i in range(1, len(ec_params) + 1):
            table_data.append(
                [
                    f"Curve {i}",
                    num_tries,
                    successes[i - 1],
                    f"{success_rates[i - 1] * 100}%",
                ]
            )

        print(tabulate(table_data, headers="firstrow", tablefmt="grid"))

    @staticmethod
    def benchmark(curves: list, num_tries: int = 50) -> list:
        results = []
        for curve in curves:
            attacker = Setup(Curve(int(curve.a), int(curve.b), int(curve.field)))
            attacker.ec.base = Point(attacker.ec, int(curve.base.x), int(curve.base.y))
            attacker.ec.n = int(curve.n)
            success_count = 0
            start_time = time.time()
            for _ in range(num_tries):
                try:
                    if attacker.generate_keys(False):
                        success_count += 1
                except Exception:
                    continue
            end_time = time.time()
            elapsed_time = end_time - start_time
            results.append((success_count, success_count / num_tries, elapsed_time))
        return results

def test_setup():
    # SECP256k1
    ec = Curve(0, 7)
    ec.field = (
        115792089237316195423570985008687907853269984665640564039457584007908834671663
    )
    ec.n = (
        115792089237316195423570985008687907852837564279074904382605163141518161494337
    )
    ec.base = Point(
        0,
        ec.field,
        79086247176140945631788741473243917373392091539978947803256065440939503345144,
        46592427867154248619823560021064937204868064911504510519907326227152259586360,
    )

    attacker = Setup(ec)
    attacker.generate_keys()
    Setup.test()
