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

    def __init__(self, a: int, b: int, field: int, simulation: bool = False) -> None:
        self.n = 0
        self.points = []
        self.public_keys = {}

        self.simulation = simulation
        self.a, self.b, self.field = a, b, field
        self.base = Point(self)


    def __setattr__(self, __name: str, __value: Any) -> None:
        if __name in ["a", "b", "field", "n"] and not isinstance(__value, int):
            raise ValueError(f'Invalid value! {__name} must be an integer.')
        if __name == "points" and not isinstance(__value, list):
            raise ValueError(f'Invalid value! {__name} must be a list.')
        if __name__ == "base" and not type(__value) == Point:
            raise ValueError(f'Invalid value! {__name} must be a Point.')
        if __name == "public_keys" and not isinstance(__value, dict):
            raise ValueError(f'Invalid value! {__name} must be a dict.')
        if __name == "alphabet" and not isinstance(__value, str):
            raise ValueError(f'Invalid value! {__name} must be a string.')
        if __name == 'field' and not isprime(__value) and hasattr(self, 'simulation') and self.simulation:
            raise ValueError('Not a prime number!')
        super().__setattr__(__name, __value)
        if __name in ["a", "b", "field"]:
            if hasattr(self, "a") and hasattr(self, "b") and hasattr(self, "field") and getattr(self, "simulation", False):
                try:
                    self.calculate_points()
                except ValueError:
                    pass

    def order(self) -> int:
        return len(self.points) + 1

    def M(self, alphabet: str = None) -> int:
        return len(alphabet)

    def calculate_points(self) -> None:
        self.points = []
        print(self.a, self.b, self.field)
        if self.a is None or self.b is None or self.field is None:
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
        self, alphabet: str, message: str, secret: int, public_key: "Point", shared=False
    ) -> list:
        if not self.base:
            raise ValueError("Base point not set!")
        if public_key == Point(self):
            raise ValueError("Public key of the other party not set!")
        if secret == 0:
            return [Point(self)] * len(message)
        if not shared:
            return [
                (Qm + (public_key * secret), self.base * secret)
                for Qm in self.encode(alphabet, message)
            ]
        return [(Qm + public_key, self.base * secret) for Qm in self.encode(alphabet, message)]

    def decrypt(self, alphabet: str, points: list, secret: int, public_key: "Point" = None) -> str:
        if not self.base:
            raise ValueError("Base point not set!")
        msg = ""
        if secret == 0:
            return msg
        if public_key is None:
            for encrypted, public_key in points:
                shared = public_key * secret
                decrypted = encrypted - shared
                if decrypted is None:
                    return ""
                msg += self.decode(alphabet, [decrypted])
        else:
            shared = public_key * secret
            for encrypted in points:
                decrypted = encrypted - shared
                if decrypted is None:
                    return ""
                msg += self.decode(alphabet, [decrypted])
        return msg
