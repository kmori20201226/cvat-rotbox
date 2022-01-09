// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable no-underscore-dangle */
/* eslint @typescript-eslint/no-unused-expressions: "off" */

import * as SVG from 'svg.js';
import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';
import 'svg.draw.js';

import {
    Point, stringifyPoints, translateToSVG, parsePoints,
} from './shared';

import { RotboxModel, rotboxPolyFrom2Points, distanceToSegment } from './rotbox';

import consts from './consts';

(SVG as any).Rotbox = SVG.invent({
    create: 'g',
    inherit: SVG.G,
    extend: {
        constructorMethod(pointsStr: string): void {
            const points = parsePoints(pointsStr);
            const rb = new RotboxModel(points);
            this.x(0).y(0);
            this.g = this.put(new SVG.G());
            this.g.x(0).y(0);
            this.g.face = this.g
                .put(this.g.rect(rb.width, rb.height, { drawCircles: false }))
                .center(rb.width / 2.0, rb.height / 2.0);
            // this.transform({ x: rb.cx, y: rb.cy });
            this.x(rb.cx).y(rb.cy);
            this.addClass('cvat_canvas_shape_rotbox')
                .addClass('cvat_canvas_shape');
            this.rb_model = rb;
            this.updateView();
            return this;
        },
        updateView(): void {
            const rb = this.rb_model;
            this.g.face.size(rb.width, rb.height);
            this.g.face.transform({ x: -rb.width / 2.0, y: -rb.height / 2.0 });
            this.g.rotate(rb.angle, 0, 0);
            this.transform({ x: rb.cx, y: rb.cy });
            // to correct getting of points in resizedone, dragdone
            this._attr(
                'points',
                rb
                    .getPoints()
                    .reduce((acc: string, point: Point): string => `${acc} ${point.x},${point.y}`, '')
                    .trim(),
            );
            if (this.centerLine) {
                this.centerLine.plot(-rb.width / 2, 0, rb.width / 2, 0);
            }
            this.updateGrabPoints();
        },
        reshape(p1: Point, p2: Point, height: number): void {
            const points = rotboxPolyFrom2Points(p1, p2, height);
            this.rb_model = new RotboxModel(parsePoints(points));
        },
        selectize(value: boolean, options: object): void {
            this.g.face.selectize(value, {
                points: [],
                rotationPoint: false,
            });
            if (value === false) {
                this.getGrabPoints().forEach((point: SVG.Element): void => {
                    point &&
                        point
                            .off('dragstart')
                            .off('dragmove')
                            .off('dragend')
                            .off('mouserenter')
                            .off('mouseleave')
                            .remove();
                });
                this.off('dragstart').off('dragmove').off('dragend');
                if (this.centerLine) {
                    this.centerLine.remove();
                    this.flipSwitch.remove();
                    this.centerLine = undefined;
                    this.flipSwitch = undefined;
                }
            } else {
                let startRotboxPoint: Point;
                let startClientPoint: Point;
                this.setupCenterline(options);
                this.setupGrabPoints(options);
                this.on('dragstart', (event: CustomEvent): void => {
                    const rb = this.rb_model;
                    const svg = this.node.parentElement;
                    const [x, y] = translateToSVG((svg as any) as SVGSVGElement, [
                        event.detail.event.clientX,
                        event.detail.event.clientY,
                    ]);
                    startClientPoint = { x, y };
                    startRotboxPoint = { x: rb.cx, y: rb.cy };
                    this.fire(new CustomEvent('resizestart', event));
                });
                this.on('dragmove', (event: CustomEvent): void => {
                    this.fire(new CustomEvent('resizing', event));
                });
                this.on('dragend', (event: CustomEvent): void => {
                    const svg = this.node.parentElement;
                    const [x, y] = translateToSVG((svg as any) as SVGSVGElement, [
                        event.detail.event.clientX,
                        event.detail.event.clientY,
                    ]);
                    this.rb_model.cx = startRotboxPoint.x + (x - startClientPoint.x);
                    this.rb_model.cy = startRotboxPoint.y + (y - startClientPoint.y);
                    this.fire(new CustomEvent('resizedone', event));
                });
            }
        },
        getGrabPoints(): Point[] {
            const arr = [];
            arr.push(this.fGrabPoint);
            arr.push(this.bGrabPoint);
            arr.push(this.lGrabPoint);
            arr.push(this.rGrabPoint);
            return arr;
        },
        updateGrabPoints(): void {
            const rb = this.rb_model;
            const h = rb.height / 2.0;
            const w = rb.width / 2.0;
            this.getGrabPoints().forEach((p: any): void => {
                p && p.center(p.dx * w, p.dy * h); // eslint-disable-line no-unused-expressions
            });
        },
        setupCenterline(options: any): void {
            const rb = this.rb_model;
            const w = rb.width / 2.0;
            const { pointSize } = options;
            this.centerLine = this.g.line(w, 0, -w, 0).stroke({ width: 2, color: '#00f', dasharray: '5,5' });
            this.g.put(this.centerLine);
            const path = consts.ARROW_PATH;
            const f = (5.0 * pointSize) / 50.0;
            this.flipSwitch = this.g
                .path(path)
                .fill('white')
                .stroke({
                    width: 1,
                    color: 'black',
                })
                .addClass('cvat_canvas_poly_direction')
                .style({
                    'transform-origin': '0px 0px',
                    transform: `scale(${f})`,
                })
                .move(0, 0);
            this.g.put(this.flipSwitch);
            this.flipSwitch.on('mousedown', (e: MouseEvent): void => {
                if (e.button === 0) {
                    e.stopPropagation();
                    if (e.shiftKey) {
                        rb.angle = rb.angle < 0 ? rb.angle + 90 : rb.angle - 90;
                        [rb.height, rb.width] = [rb.width, rb.height];
                    } else {
                        rb.angle = rb.angle < 0 ? rb.angle + 180 : rb.angle - 180;
                    }
                    this.updateView();
                    this.fire(new CustomEvent('resizedone', e));
                }
            });
            this.flipSwitch.dmove(-this.flipSwitch.width() / 2, -this.flipSwitch.height() / 2);
        },
        setupGrabPoints(options: any): void {
            const rb = this.rb_model;
            const h = rb.height / 2.0;
            const w = rb.width / 2.0;

            let tailEnd: Point;
            let headEnd: Point;
            let grabbed: Point;
            let dragStartPoint: Point;
            const { pointSize } = options;
            const r = (50.0 * pointSize) / 50.0;
            const a = (40.0 * pointSize) / 50.0;
            const F = (): any => {
                const g = this.g.group();
                g.path(`M0,0 L${a},${a} 0,${a * 2}`).transform({ x: a / 2, y: 0 });
                return g;
            };
            const B = (): any => this.g.rect(pointSize / 2.0, pointSize);
            const L = (): any => {
                const g = this.g.group();
                g.path(`M${-r},0 a1,1 0 0,1 ${r},0`).transform({ x: r, y: r / 4 });
                return g;
            };
            const R = (): any => {
                const g = this.g.group();
                g.path(`M${-r},0 a1,1 0 1,0 ${r},0`).transform({ x: r, y: r / 4 });
                return g;
            };
            const makeUp = (shape: any, dx: number, dy: number, tag: string): any => {
                const circle = shape
                    .center(dx * w, dy * h)
                    .addClass('svg_select_points')
                    .addClass(tag)
                    .on('dragstart', (event: CustomEvent): void => {
                        const svg = circle.node.parentElement.parentElement.parentElement;
                        const [x, y] = translateToSVG((svg as any) as SVGSVGElement, [
                            event.detail.event.clientX,
                            event.detail.event.clientY,
                        ]);
                        dragStartPoint = { x, y };
                        tailEnd = rb.getRealPoint({ x: -w, y: 0 });
                        headEnd = rb.getRealPoint({ x: w, y: 0 });
                        grabbed = rb.getRealPoint({ x: dx * w, y: dy * h });
                        this.fire(new CustomEvent('resizestart', event));
                    })
                    .on('dragmove', (event: CustomEvent): void => {
                        const svg = circle.node.parentElement.parentElement.parentElement;
                        const [x, y] = translateToSVG((svg as any) as SVGSVGElement, [
                            event.detail.event.clientX,
                            event.detail.event.clientY,
                        ]);
                        const movingEnd: Point = {
                            x: x - dragStartPoint.x + grabbed.x,
                            y: y - dragStartPoint.y + grabbed.y,
                        };
                        if (dx > 0) {
                            this.reshape(tailEnd, movingEnd, this.rb_model.height);
                        } else if (dx < 0) {
                            this.reshape(movingEnd, headEnd, this.rb_model.height);
                        } else if (dy !== 0) {
                            const height = distanceToSegment(movingEnd, headEnd, tailEnd) * 2.0;
                            this.reshape(tailEnd, headEnd, height);
                        }
                        this.updateView();
                        this.fire(new CustomEvent('resizing', event));
                    })
                    .on('dragend', (event: CustomEvent): void => {
                        this.fire(new CustomEvent('resizedone', event));
                    });
                circle.dx = dx;
                circle.dy = dy;
                circle.updateView = function (): void {
                    this.center(this.dx * w, this.dy * h);
                };
                circle.on('mouseenter', (): void => {
                    circle.addClass('cvat_canvas_selected_point');
                    circle.draggable((): any => ({}));
                });

                circle.on('mouseleave', (): void => {
                    circle.removeClass('cvat_canvas_selected_point');
                });
                return circle;
            };
            this.lGrabPoint = makeUp(L(), 0, -1, 'svg_select_points_l');
            this.rGrabPoint = makeUp(R(), 0, 1, 'svg_select_points_r');
            this.bGrabPoint = makeUp(B(), -1, 0, 'svg_select_points_b');
            this.fGrabPoint = makeUp(F(), 1, 0, 'svg_select_points_f');
        },
        _attr: SVG.Element.prototype.attr,
        attr(a: any, v: any, n: any): any {
            if (a === 'points' && typeof v === 'string') {
                // const points = parsePoints(v);
                // this.cuboidModel.setPoints(points);
                // this.updateViewAndVM();
            } else if (a === 'points' && v === undefined) {
                return stringifyPoints(this.rb_model.getPoints());
            } else {
                return this._attr(a, v, n);
            }

            return this;
        },
    },
    construct: {
        rotbox(points: string): any {
            return this.put(new (SVG as any).Rotbox()).constructorMethod(points);
        },
    },
});
