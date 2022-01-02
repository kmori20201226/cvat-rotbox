// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Point } from './shared';

export function midPoint(p1: Point, p2: Point): Point {
    return { x: (p2.x + p1.x) / 2, y: (p2.y + p1.y) / 2 };
}

export function distance(p1: Point, p2: Point): number {
    const x = (p2.x - p1.x) ** 2;
    const y = (p2.y - p1.y) ** 2;
    return Math.sqrt(x + y);
}

export function getYawAngle(p1: Point, p2: Point): number {
    return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
}

/* eslint-disable no-mixed-operators */
function dist2(v: Point, w: Point): number {
    return (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
}
/* eslint-enable no-mixed-operators */

function distToSegmentSquared(p: Point, v: Point, w: Point): number {
    const l2 = dist2(v, w);
    if (l2 === 0) return dist2(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

export function distanceToSegment(p: Point, l0: Point, l1: Point): number {
    return Math.sqrt(distToSegmentSquared(p, l0, l1));
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function multiplyMatrixAndPoint(matrix: number[], point: number[]): number[] {
    // Give a simple variable name to each part of the matrix, a column and row number
    const c0r0 = matrix[0];
    const c1r0 = matrix[1];
    const c2r0 = matrix[2];
    const c3r0 = matrix[3];
    const c0r1 = matrix[4];
    const c1r1 = matrix[5];
    const c2r1 = matrix[6];
    const c3r1 = matrix[7];
    const c0r2 = matrix[8];
    const c1r2 = matrix[9];
    const c2r2 = matrix[10];
    const c3r2 = matrix[11];
    const c0r3 = matrix[12];
    const c1r3 = matrix[13];
    const c2r3 = matrix[14];
    const c3r3 = matrix[15];

    // Now set some simple names for the point
    const x = point[0];
    const y = point[1];
    const z = point[2];
    const w = point[3];

    // Multiply the point against each part of the 1st column, then add together
    const resultX = x * c0r0 + y * c0r1 + z * c0r2 + w * c0r3;

    // Multiply the point against each part of the 2nd column, then add together
    const resultY = x * c1r0 + y * c1r1 + z * c1r2 + w * c1r3;

    // Multiply the point against each part of the 3rd column, then add together
    // let resultZ = (x * c2r0) + (y * c2r1) + (z * c2r2) + (w * c2r3);

    // Multiply the point against each part of the 4th column, then add together
    // let resultW = (x * c3r0) + (y * c3r1) + (z * c3r2) + (w * c3r3);

    return [resultX, resultY];
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/*
//matrixB • matrixA
function multiplyMatrices(matrixA: number[], matrixB: number[]): number[] {
    // Slice the second matrix up into rows
    let row0 = [matrixB[ 0], matrixB[ 1], matrixB[ 2], matrixB[ 3]];
    let row1 = [matrixB[ 4], matrixB[ 5], matrixB[ 6], matrixB[ 7]];
    let row2 = [matrixB[ 8], matrixB[ 9], matrixB[10], matrixB[11]];
    let row3 = [matrixB[12], matrixB[13], matrixB[14], matrixB[15]];

    // Multiply each row by matrixA
    let result0 = multiplyMatrixAndPoint(matrixA, row0);
    let result1 = multiplyMatrixAndPoint(matrixA, row1);
    let result2 = multiplyMatrixAndPoint(matrixA, row2);
    let result3 = multiplyMatrixAndPoint(matrixA, row3);

    // Turn the result rows back into a single matrix
    return [
        result0[0], result0[1], result0[2], result0[3],
        result1[0], result1[1], result1[2], result1[3],
        result2[0], result2[1], result2[2], result2[3],
        result3[0], result3[1], result3[2], result3[3]
    ];
}
*/

const { sin } = Math;
const { cos } = Math;

// Rotate around Z axis
function rotateZMatrix(a: number, dx: number, dy: number): number[] {
    return [cos(a), -sin(a), 0, 0, sin(a), cos(a), 0, 0, 0, 0, 1, 0, dx, dy, 0, 1];
}

export function rotbox2poly(cx: number, cy: number, width: number, height: number, angle: number): number[] {
    /*
      p[3] +----------------------+ p[0]
           |                      |  |
           |       (cx,cy)        |  | CW
           |                      |  v
      p[2] +----------------------+ p[1]
    */
    const w = width / 2;
    const h = height / 2;
    const mx = rotateZMatrix((Math.PI * angle) / 180, cx, cy);
    return [
        ...multiplyMatrixAndPoint(mx, [w, -h, 0, 1]), // p[0]
        ...multiplyMatrixAndPoint(mx, [w, h, 0, 1]), // p[1]
        ...multiplyMatrixAndPoint(mx, [-w, h, 0, 1]), // p[2]
        ...multiplyMatrixAndPoint(mx, [-w, -h, 0, 1]), // p[3]
    ];
}

export function rotboxPolyFrom2Points(p1: Point, p2: Point, height: number): number[] {
    const center = midPoint(p1, p2);
    const width = distance(p2, p1);
    const angle = width === 0 ? 0 : getYawAngle(p1, p2);
    return rotbox2poly(center.x, center.y, width, height, -angle);
}

export class RotboxModel {
    public cx: number;
    public cy: number;
    public width: number;
    public height: number;
    public angle: number;

    public constructor(points?: Point[]) {
        /*
                   p[0]     p[1]
                    +-------+
                   |   |   |
                  |   |   |
                 +---+---+
                |   |   |
               |   |   |
              +-------+
             p[3]     p[2]
        */
        this.height = distance(points[0], points[1]);
        this.width = distance(points[1], points[2]);
        this.angle = getYawAngle(points[1], points[2]);
        const p1 = midPoint(points[0], points[1]);
        const p2 = midPoint(points[2], points[3]);
        const pc = midPoint(p1, p2);
        this.cx = pc.x;
        this.cy = pc.y;
    }
    /**
     * Get real points of rotated box
     * @param pt (x:-width/2 ... width/2), (y:-height/2 ... height/2)
     * @returns
     */
    public getRealPoint(pt: Point): Point {
        const mx = rotateZMatrix((Math.PI * -this.angle) / 180, this.cx, this.cy);
        const rv = multiplyMatrixAndPoint(mx, [pt.x, pt.y, 0, 1]);
        return { x: rv[0], y: rv[1] };
    }

    public getPoints(): Point[] {
        const w = this.width / 2.0;
        const h = this.height / 2.0;
        return [
            this.getRealPoint({ x: w, y: -h }),
            this.getRealPoint({ x: w, y: h }),
            this.getRealPoint({ x: -w, y: h }),
            this.getRealPoint({ x: -w, y: -h }),
        ];
    }
}
