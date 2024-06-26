from typing import Any
from sympy import isprime
from app.services.point_service import Point

class Curve:
    """Class representing an elliptic curve used in ECC.

    Attributes:
        a: Coefficient of the curve.
        b: Coefficient of the curve.
        field: Field of the curve.
        n: Order of the curve.
        points: List of points on the curve.
        base: Base point on the curve.
        public_keys: Dictionary of public keys.
        simulation: Flag to indicate if the curve is in simulation mode.

    Methods:
        __setattr__: Set the value of an attribute.
        order: Return the order of the curve.
        M: Return the size of the alphabet.
        calculate_points: Calculate the points on the curve.ç
        steps: Return the steps to calculate a scalar multiplication.
        encode: Encode a message using the alphabet.
        decode: Decode a list of points using the alphabet.
        encrypt: Encrypt a message using a public key.
        decrypt: Decrypt a list of points using a private key.
    """

    def __init__(self, a: int, b: int, simulation: bool = False):
        self.a = a
        self.b = b
        self.field = 0
        self.n = 0
        self.points = []
        self.base = Point(a, 0)
        self.public_keys = {}
        self.simulation = simulation

    def __setattr__(self, __name: str, __value: Any) -> None:
        if __name in ["a", "b", "field", "n"] and not isinstance(__value, int):
            raise ValueError(f'Invalid value! {__name} must be an integer.')
        if __name == "points" and not isinstance(__value, list):
            raise ValueError(f'Invalid value! {__name} must be a list.')
        if __name__ == "base" and not isinstance(__value, "Point"):
            raise ValueError(f'Invalid value! {__name} must be a Point.')
        if __name == "public_keys" and not isinstance(__value, dict):
            raise ValueError(f'Invalid value! {__name} must be a dict.')
        if __name == "alphabet" and not isinstance(__value, str):
            raise ValueError(f'Invalid value! {__name} must be a string.')
        # if __name == 'field' and not isprime(__value):
        #   raise ValueError('Not a prime number!')
        if __name in ["a", "b", "field"] and getattr(self, __name, None) != __value:
            self.points = []
            super().__setattr__(__name, __value)
            if self.simulation:
                self.calculate_points()
            return
        super().__setattr__(__name, __value)

    def order(self) -> int:
        return len(self.points) + 1

    def M(self, alphabet: str = None) -> int:
        return len(alphabet)

    def calculate_points(self) -> None:
        if any(param is None for param in [self.a, self.b, self.field]):
            raise ValueError(
                f"Parameters not set! a: {self.a}, b: {self.b}, field: {self.field}"
            )

        for x in range(self.field):
            y2 = (x**3 + self.a * x + self.b) % self.field
            for y in range(self.field):
                if y**2 % self.field == y2:
                    self.points.append(Point(self, x, y))

    def steps(self, point: "Point", scalar: int) -> list:
        result = []
        for i in range(1, scalar + 1):
            if not (point * i).at_infinity():
                result.append(point * i)
        return result

    def encode(self, alphabet: str, message: str) -> list:
        if not alphabet:
            raise ValueError("Alphabet not set!")
        if self.field <= (self.M(alphabet) * 2):
            raise ValueError(f'Invalid prime number! {self.field} must be greater than 2 * M (M = {self.M(alphabet)}).')
        encoded = []
        h = self.field // self.M(alphabet)
        for char in message:
            if char not in alphabet:
                raise ValueError(f'Invalid character! {char} not in alphabet.')
            char_i = alphabet.index(char)
            j = 0
            while True:
                x = (char_i * h + j) % self.field
                if x in [point.x for point in self.points]:
                    y = [point.y for point in self.points if point.x == x][0]
                    break
                j += 1
            encoded.append(Point(self, x, y))
        return encoded

    def decode(self, alphabet: str, points: list) -> str:
        if not alphabet:
            raise ValueError("Alphabet not set!")
        if self.field <= (self.M(alphabet) * 2):
            raise ValueError(f'Invalid prime number! {self.field} must be greater than 2 * M (M = {self.M(alphabet)}).')
        decoded = ""
        h = self.field // self.M(alphabet)
        for point in points:
            x = point.x
            nearest = x
            while nearest % h != 0 and nearest >= 0:
                nearest -= 1
            decoded += alphabet[nearest // h]
        return decoded

    def encrypt(
        self, alphabet: str, message: str, dx: int, dyG: "Point", shared=False
    ) -> list:
        if not self.base:
            raise ValueError("Base point not set!")
        if dyG == Point(self):
            raise ValueError("Public key of the other party not set!")
        if dx == 0:
            return [Point(self)] * len(message)
        if not shared:
            return [
                (Qm + (dyG * dx), self.base * dx)
                for Qm in self.encode(alphabet, message)
            ]
        return [(Qm + dyG, self.base * dx) for Qm in self.encode(alphabet, message)]

    def decrypt(self, alphabet: str, points: list, dx: int, dyG: "Point" = None) -> str:
        if not self.base:
            raise ValueError("Base point not set!")
        msg = ""
        if dx == 0:
            return msg
        if dyG is None:
            for encrypted, dyG in points:
                shared = dyG * dx
                decrypted = encrypted - shared
                if decrypted is None:
                    return ""
                msg += self.decode(alphabet, [decrypted])
        else:
            shared = dyG * dx
            for encrypted in points:
                decrypted = encrypted - shared
                if decrypted is None:
                    return ""
                msg += self.decode(alphabet, [decrypted])
        return msg
