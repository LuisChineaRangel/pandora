import time
from app.services.point_service import Point
from app.services.curve_service import Curve

DELIMITER = "--------------------------------------------------------------------------------------------"


class BabyStepGiantStep:
    def __init__(self, ec: "Curve", m: int, G: "Point", A: "Point"):
        self.ec = ec
        self.m = m
        self.G = G
        self.A = A

    def __baby_step(self) -> list:
        baby_steps = [None] * self.m
        for i in range(self.m):
            result = self.G * i
            if result.at_infinity():
                result = Point(self.ec.a, self.ec.field, 0, 0)
            baby_steps[i] = result
        return baby_steps

    def __giant_step(self) -> list:
        giant_steps = [None] * self.m
        for i in range(self.m):
            result = self.G * (self.m * i)
            if result.at_infinity():
                result = Point(self.ec.a, self.ec.field, 0, 0)
            giant_steps[i] = self.A - result
        return giant_steps

    def attack(self) -> int:
        found = False
        baby_steps = self.__baby_step()
        giant_steps = self.__giant_step()
        i = 0
        j = 0
        for j in range(self.m):
            for i in range(self.m):
                if baby_steps[i] == giant_steps[j]:
                    found = True
                    break
            if found:
                break

        if not found:
            return None

        alpha = i + j * self.m
        alpha = (alpha + self.ec.field) % self.ec.field
        return alpha

    @staticmethod
    def benchmark(curves: list, num_tries: int) -> None:

        results = []
        for data in curves:
            curve = data[0]
            ec = Curve(int(curve.a), int(curve.b), int(curve.field))
            ec.base = Point(ec, int(curve.base.x), int(curve.base.y))
            A = Point(ec, int(data[1].x), int(data[1].y))
            m = int(data[2])
            attacker = BabyStepGiantStep(ec, m, ec.base, A)
            success_count = 0
            start = time.time()
            for _ in range(num_tries):
                alpha = attacker.attack()
                if alpha is not None:
                    success_count += 1
            end = time.time()
            elapsed_time = end - start
            results.append((success_count, success_count / num_tries, elapsed_time))
        return results

def test_baby_step_giant_step():
    ec = Curve(2, 2)
    ec.field = 17
    ec.base = Point(
        ec.a,
        ec.field,
        5,
        1,
    )

    A = Point(ec.a, ec.field, 10, 6)
    m = 5
    attacker = BabyStepGiantStep(ec, m, ec.base, A)
    alpha = attacker.attack()
    print(f"Private key: {alpha}")
    calculated_A = ec.base * alpha
    print(f"Calculated A: {calculated_A}")
    if calculated_A == A:
        print("Attack successful")
    else:
        print("Attack failed")
