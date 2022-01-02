// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';

export interface ShapeSizeElement {
    sizeElement: any;
    update(shape: SVG.Shape): void;
    rm(): void;
}

export interface Box {
    xtl: number;
    ytl: number;
    xbr: number;
    ybr: number;
}

export interface BBox {
    width: number;
    height: number;
    x: number;
    y: number;
}

export interface Point {
    x: number;
    y: number;
}

interface Vector2D {
    i: number;
    j: number;
}

export interface DrawnState {
    clientID: number;
    outside?: boolean;
    occluded?: boolean;
    hidden?: boolean;
    lock: boolean;
    source: 'AUTO' | 'MANUAL';
    shapeType: string;
    points?: number[];
    attributes: Record<number, string>;
    descriptions: string[];
    zOrder?: number;
    pinned?: boolean;
    updated: number;
    frame: number;
    label: any;
}

// Translate point array from the canvas coordinate system
// to the coordinate system of a client
export function translateFromSVG(svg: SVGSVGElement, points: number[]): number[] {
    const output = [];
    const transformationMatrix = svg.getScreenCTM() as DOMMatrix;
    let pt = svg.createSVGPoint();
    for (let i = 0; i < points.length - 1; i += 2) {
        pt.x = points[i];
        pt.y = points[i + 1];
        pt = pt.matrixTransform(transformationMatrix);
        output.push(pt.x, pt.y);
    }

    return output;
}

// Translate point array from the coordinate system of a client
// to the canvas coordinate system
export function translateToSVG(svg: SVGSVGElement, points: number[]): number[] {
    const output = [];
    const transformationMatrix = (svg.getScreenCTM() as DOMMatrix).inverse();
    let pt = svg.createSVGPoint();
    for (let i = 0; i < points.length; i += 2) {
        pt.x = points[i];
        pt.y = points[i + 1];
        pt = pt.matrixTransform(transformationMatrix);
        output.push(pt.x, pt.y);
    }

    return output;
}

export function displayShapeSize(shapesContainer: SVG.Container, textContainer: SVG.Container): ShapeSizeElement {
    const shapeSize: ShapeSizeElement = {
        sizeElement: textContainer
            .text('')
            .font({
                weight: 'bolder',
            })
            .fill('white')
            .addClass('cvat_canvas_text'),
        update(shape: SVG.Shape): void {
            const bbox = shape.bbox();
            const text = `${bbox.width.toFixed(1)}x${bbox.height.toFixed(1)}`;
            const [x, y]: number[] = translateToSVG(
                (textContainer.node as any) as SVGSVGElement,
                translateFromSVG((shapesContainer.node as any) as SVGSVGElement, [bbox.x, bbox.y]),
            );
            this.sizeElement
                .clear()
                .plain(text)
                .move(x + consts.TEXT_MARGIN, y + consts.TEXT_MARGIN);
        },
        rm(): void {
            if (this.sizeElement) {
                this.sizeElement.remove();
                this.sizeElement = null;
            }
        },
    };

    return shapeSize;
}

export function pointsToNumberArray(points: string | Point[]): number[] {
    if (Array.isArray(points)) {
        return points.reduce((acc: number[], point: Point): number[] => {
            acc.push(point.x, point.y);
            return acc;
        }, []);
    }

    return points
        .trim()
        .split(/[,\s]+/g)
        .map((coord: string): number => +coord);
}

export function parsePoints(source: string | number[]): Point[] {
    if (Array.isArray(source)) {
        return source.reduce((acc: Point[], _: number, index: number): Point[] => {
            if (index % 2) {
                acc.push({
                    x: source[index - 1],
                    y: source[index],
                });
            }

            return acc;
        }, []);
    }

    return source
        .trim()
        .split(/\s/)
        .map(
            (point: string): Point => {
                const [x, y] = point.split(',').map((coord: string): number => +coord);
                return { x, y };
            },
        );
}

export function stringifyPoints(points: (Point | number)[]): string {
    if (typeof points[0] === 'number') {
        return points.reduce((acc: string, val: number, idx: number): string => {
            if (idx % 2) {
                return `${acc},${val}`;
            }

            return `${acc} ${val}`.trim();
        }, '');
    }
    return points.map((point: Point): string => `${point.x},${point.y}`).join(' ');
}

export function clamp(x: number, min: number, max: number): number {
    return Math.min(Math.max(x, min), max);
}

export function scalarProduct(a: Vector2D, b: Vector2D): number {
    return a.i * b.i + a.j * b.j;
}

export function vectorLength(vector: Vector2D): number {
    const sqrI = vector.i ** 2;
    const sqrJ = vector.j ** 2;
    return Math.sqrt(sqrI + sqrJ);
}

export function translateToCanvas(offset: number, points: number[]): number[] {
    return points.map((coord: number): number => coord + offset);
}

export type PropType<T, Prop extends keyof T> = T[Prop];

// Calculate the bounding box of an element with respect to its parent element
export function transformedBoundingBox(el: any): any {
    const bb = el.getBBox();
    const svg = el.ownerSVGElement;
    // m   = el.getTransformToElement(el.parentNode);
    const m = el.getCTM();

    // Create an array of all four points for the original bounding box
    const pts = [svg.createSVGPoint(), svg.createSVGPoint(), svg.createSVGPoint(), svg.createSVGPoint()];
    pts[0].x = bb.x;
    pts[0].y = bb.y;
    pts[1].x = bb.x + bb.width;
    pts[1].y = bb.y;
    pts[2].x = bb.x + bb.width;
    pts[2].y = bb.y + bb.height;
    pts[3].x = bb.x;
    pts[3].y = bb.y + bb.height;

    // Transform each into the space of the parent,
    // and calculate the min/max points from that.
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    pts.forEach((pt: any): any => {
        const pt1 = pt.matrixTransform(m);
        xMin = Math.min(xMin, pt1.x);
        xMax = Math.max(xMax, pt1.x);
        yMin = Math.min(yMin, pt1.y);
        yMax = Math.max(yMax, pt1.y);
    });

    // Update the bounding box with the new values
    bb.x = xMin;
    bb.width = xMax - xMin;
    bb.y = yMin;
    bb.height = yMax - yMin;
    return bb;
}
