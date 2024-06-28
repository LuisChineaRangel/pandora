export class Point {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    equals(other: Point) {
        return this.x === other.x && this.y === other.y;
    }

    negate() {
        return new Point(this.x, -this.y);
    }

    toString() {
        if (this.x === -1 && this.y === -1)
            return '(O)';
        return `(${this.x}, ${this.y})`;
    }

    toJSON() {
        return JSON.stringify({ x: this.x, y: this.y }, null, 4);
    }

    static fromString(str: string) {
        if (str === '(O)')
            return new Point(-1, -1);
        const [x, y] = str.replace('(', '').replace(')', '').replace(' ', '').split(',').map(Number);
        return new Point(x, y);
    }

    static distance(p1: Point, p2: Point) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
}
