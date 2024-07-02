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
        m: Return the size of the alphabet.
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
            raise ValueError(f"Invalid value! {__name} must be an integer.")
        if __name__ == "base" and type(__value) != Point:
            raise ValueError(f"Invalid value! {__name} must be a Point.")
        if (
            __name == "field"
            and not isprime(__value)
            and hasattr(self, "simulation")
            and self.simulation
        ):
            raise ValueError("Not a prime number!")
        super().__setattr__(__name, __value)
        if (
            __name in ["a", "b", "field"]
            and hasattr(self, "a")
            and hasattr(self, "b")
            and hasattr(self, "field")
            and getattr(self, "simulation", False)
        ):
            try:
                self.calculate_points()
            except ValueError:
                pass

    def order(self) -> int:
        return len(self.points) + 1

    def m(self, alph: str = None) -> int:
        return len(alph)

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

    def encode(self, alph: str, msg: str) -> list:
        if not alph:
            raise ValueError("Alphabet not set!")
        if self.field <= (self.m(alph) * 2):
            raise ValueError(
                f"Invalid prime number! {self.field} must be greater than 2 * M (M = {self.m(alph)})."
            )
        encoded = []
        h = self.field // self.m(alph)
        for char in msg:
            if char not in alph:
                raise ValueError(f"Invalid character! {char} not in alphabet.")
            char_i = alph.index(char)
            j = 0
            while True:
                x = (char_i * h + j) % self.field
                if x in [point.x for point in self.points]:
                    y = [point.y for point in self.points if point.x == x][0]
                    break
                j += 1
            encoded.append(Point(self, x, y))
        return encoded

    def decode(self, alph: str, points: list) -> str:
        if not alph:
            raise ValueError("Alphabet not set!")
        if self.field <= (self.m(alph) * 2):
            raise ValueError(
                f"Invalid prime number! {self.field} must be greater than 2 * M (M = {self.m(alph)})."
            )
        decoded = ""
        h = self.field // self.m(alph)
        for point in points:
            x = point.x
            nearest = x
            while nearest % h != 0 and nearest >= 0:
                nearest -= 1
            decoded += alph[nearest // h]
        return decoded

    def encrypt(
        self,
        alph: str,
        msg: str,
        encryption,
        decryption,
        multiple: bool = False,
    ) -> list:
        if not self.base:
            raise ValueError("Base point not set!")
        if decryption == Point(self) and type(decryption) == Point:
            raise ValueError("Public key of the other party not set!")
        if isinstance(encryption, int) and encryption == 0:
            return [Point(self)] * len(msg)

        # Encrypt the message for multiple receivers
        if multiple:
            return [(Qm + encryption, decryption) for Qm in self.encode(alph, msg)]
        # Encrypt the message for a single receiver
        return [
            (Qm + (decryption * encryption), self.base * encryption)
            for Qm in self.encode(alph, msg)
        ]

    def decrypt(
        self, alph: str, points: list, private_k: int, public_k: "Point"
    ) -> str:
        if not self.base:
            raise ValueError("Base point not set!")
        msg = ""
        if private_k == 0:
            return msg
        for encrypted in points:
            decrypted = encrypted - public_k * private_k
            if decrypted is None:
                return ""
            msg += self.decode(alph, [decrypted])
        return msg
