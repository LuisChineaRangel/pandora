import { Complex } from "complex.js";
import { ChartOptions } from "chart.js";
import { Point } from "@app/core/utils/point";

/**
 * @function axisConfig
 * @param {string} type - Type of the axis
 * @param {string} position - Position of the axis
 * @param {number} min - Minimum value of the axis
 * @param {number} max - Maximum value of the axis
 * @description Function to create the axis configuration for the elliptic curve
 * @returns {Object} - Axis configuration
 */
export function axisConfig(type: string, position: string, min: number, max: number) {
    return {
        type: type,
        position: position,
        ticks: {
            stepSize: 1,
        },
        min: min,
        max: max,
    };
}

/**
 * @function chartOptions
 * @param {number} x_min - Minimum value of the x-axis
 * @param {number} x_max - Maximum value of the x-axis
 * @param {number} y_min - Minimum value of the y-axis
 * @param {number} y_max - Maximum value of the y-axis
 * @param {Object} elements - Elements configuration
 * @description Function to create the chart options for the elliptic curve
 * @returns {Object} - Chart options
 */
export function chartOptions(x_min: number, x_max: number, y_min: number, y_max: number, elements: any = {}) {
    return {
        events: [],
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            x: axisConfig("linear", "bottom", x_min, x_max),
            y: axisConfig("linear", "left", y_min, y_max),
        },
        elements: elements
    } as ChartOptions;
}

/**
 * @function dsConfig
 * @param {Array} data - Data for the dataset
 * @description Function to create the dataset configuration for the elliptic curve
 * @returns {Object} - Dataset configuration
 */
export function dsConfig(data: any[]) {
    const skipped = (ctx: any, value: any) =>
        ctx.p0.parsed.y === 0 && ctx.p1.parsed.y === 0 ? value : undefined;
    return {
        data: data,
        borderColor: "rgba(255, 99, 132, 1)",
        fill: true,
        tension: 0.4,
        segment: {
            borderColor: (ctx: any) => skipped(ctx, "rgba(0, 0, 0, 0)"),
        },
    };
}

/**
 * Calculate the configuration for the chart
 * @param a Property a of the elliptic curve
 * @param b Property b of the elliptic curve
 * @returns Configuration for the chart
 */
export function calculateConfig(a: number, b: number): { range: number; step: number; threshold: number } {
    // Calculate range based on absolute value of a and b, plus some buffer
    const range = Math.abs(a) + Math.abs(b) + 5;

    // Calculate step based on the magnitude of a and b
    const step = Math.max(0.01, Math.abs(a) * Math.abs(b) * 0.005);

    // Threshold based on expected y-values
    const threshold = Math.max(0.001, Math.abs(a) * Math.abs(b) * 0.0005);

    return { range, step, threshold };
}

/**
 * @function split
 * @param {Array} curve - The curve to split
 * @description Splits the curve into two halves in order to avoid overlapping
 * @returns {Array} The split curve
 */
export function split(curve: any[]) {
    for (let i = 0; i < curve.length - 1; ++i) {
        if (Point.distance(curve[i], curve[i + 1]) > 0.4 && i !== 0) {
            const p1 = curve[i];
            const p2 = curve[i + 1];
            curve.splice(i + 1, 0, {
                x: p1.x + Math.abs(p1.x - curve[i - 1].x),
                y: 0,
            });
            curve.splice(i + 2, 0, {
                x: p2.x - Math.abs(p2.x - curve[i + 2].x),
                y: 0,
            });
            break;
        }
    }
    return curve;
}

/**
 * @function displayCurve
 * @param {Number} a - The a value of the curve
 * @param {Number} b - The b value of the curve
 * @description Function to calculate the curve. Only for visualization purposes
 * @returns {Array} The curve
 */
export function displayCurve(a: number, b: number, config: { range: number; step: number; threshold: number }) {
    let f_half = [];
    console.log(config);
    for (let i = -config.range; i <= config.range; i += config.step) {
        var x = i;
        if (x < 1) x = Math.floor(x / config.step) * config.step;
        const expr = new Complex(x ** 3 + a * x + b);
        const sqrtExpr = expr.sqrt();
        if (!isNaN(sqrtExpr.re) && sqrtExpr.im === 0)
            f_half.push({ x, y: Math.round(Number(sqrtExpr.re) * 100) / 100 });
    }

    f_half = split(f_half);
    if (Math.abs(f_half[0].y) > config.threshold)
        f_half.unshift({
            x: f_half[0].x - Math.abs((f_half[0].x - f_half[1].x) / 2),
            y: 0,
        });
    const s_half = f_half.map((p) => ({ x: p.x, y: -p.y }));
    return [f_half, s_half];
}
