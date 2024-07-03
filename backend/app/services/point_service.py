import json
import math
from typing import Any
from sympy import mod_inverse
from app.utils import simplify_fraction


class Point:
    """Class representing a point on an elliptic curve.

    Attributes:
        a: Coefficient.
        field: Finite field of point's elliptic curve.
        x: x-coordinate of the point.
        y: y-coordinate of the point.

    Methods:
        at_infinity: Check if a point is at infinity.
        point_zero: Check if a point is the point at zero.
        __eq__: Check if two points are equal.
        __neg__: Return the negation of the point.
        __add__: Add two points.
        __sub__: Subtract two points.
        __mul__: Multiply a point by a scalar.
        __str__: Return a string representation of the point.
        to_json: Return a JSON representation of the point.
    """

    def __init__(self, params, x=0, y=0):
        self.a, self.field, self.x, self.y = params.a, params.field, x, y

    def __setattr__(self, __name: str, __value: Any) -> None:
        if __name in ["a", "field", "x", "y"] and not isinstance(__value, int) and __value != math.inf:
            raise ValueError(f'Invalid value! {__name} must be an integer.')
        if __name in ["x", "y"] and __value < 0:
            __value = math.inf
        super().__setattr__(__name, __value)

    def at_infinity(self) -> bool:
        return (self.x, self.y) == (math.inf, math.inf)

    def point_zero(self) -> bool:
        return (self.x, self.y) == (0, 0)

    def __eq__(self, other: "Point") -> bool:
        return (self.x, self.y) == (other.x, other.y)

    def __neg__(self) -> "Point":
        return Point(self, self.x, -self.y)

    def __add__(self, other: "Point") -> "Point":
        # Check if either point is at infinity or the point at zero
        if self.at_infinity() or self.point_zero():
            return other
        if other.at_infinity() or other.point_zero():
            return self

        # Check if points are inverses of each other
        if self == -other:
            return Point(self, math.inf, math.inf)

        # Check if points are the same
        if self == other:
            fraction = (3 * self.x**2 + self.a), (2 * self.y)
        else:
            fraction = (other.y - self.y), (other.x - self.x)

        num, den = simplify_fraction(fraction)

        # Handle case where simplified fraction is infinity
        if simplify_fraction(fraction) == (math.inf, math.inf):
            return Point(self, math.inf, math.inf)

        lamb = (num * mod_inverse(abs(den), self.field)) % self.field
        x3 = (lamb**2 - self.x - other.x) % self.field
        y3 = (lamb * (self.x - x3) - self.y) % self.field

        return Point(self, x3, y3)

    def __sub__(self, other: "Point") -> "Point":
        return self + (-other)

    def __mul__(self, scalar: int) -> "Point":
        if scalar == 0 or self.at_infinity():
            return Point(self, math.inf, math.inf)

        result = Point(self)
        addend = Point(self, self.x, self.y)
        while scalar:
            if scalar & 1:
                if result == Point(self):
                    result = Point(self, addend.x, addend.y)
                else:
                    result += addend
            addend += addend
            scalar >>= 1
        return result

    def __str__(self) -> str:
        if self.at_infinity():
            return "(O)"
        return f"({self.x}, {self.y})"

    def to_json(self) -> str:
        if self.at_infinity():
            return json.dumps({"x": -1, "y": -1}, indent=4)
        return json.dumps({"x": self.x, "y": self.y}, indent=4)
