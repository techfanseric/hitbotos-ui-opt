// JointJS 流程图编辑器

import { generatePythonFromGraph } from './flowchart-python-gen.js';

class FlowchartEditor {
    constructor(containerElement) {
        this.container = containerElement;
        this.graph = null;
        this.paper = null;
        this.nodeCount = 0;
        this.zoomLevel = 1;
    }

    init() {
        if (typeof joint === 'undefined') {
            this.container.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">JointJS 库加载失败</div>';
            return;
        }

        this.graph = new joint.dia.Graph();

        this.paper = new joint.dia.Paper({
            el: this.container,
            model: this.graph,
            width: this.container.offsetWidth || 600,
            height: this.container.offsetHeight || 400,
            gridSize: 10,
            drawGrid: true,
            background: { color: '#2b2b2b' },
            interactive: true,
            snapLinks: true,
            linkPinning: false,
            highlighting: {
                default: {
                    name: 'stroke',
                    options: { padding: 2 }
                }
            },
            defaultConnectionPoint: { name: 'boundary' },
            defaultLink: new joint.shapes.standard.Link({
                attrs: {
                    line: {
                        stroke: '#888',
                        strokeWidth: 2,
                        targetMarker: {
                            type: 'path',
                            d: 'M 10 -5 0 0 10 5 Z',
                            fill: '#888'
                        }
                    }
                }
            })
        });

        this._setupStencil();
        this._setupDoubleClick();
        this._addDefaultNodes();
        this.resize();
    }

    _createNode(type, x, y) {
        this.nodeCount++;
        var node;
        var label = '';

        switch (type) {
            case 'start':
                node = new joint.shapes.standard.Ellipse({
                    position: { x: x, y: y },
                    size: { width: 100, height: 50 },
                    attrs: {
                        body: {
                            fill: '#4CAF50',
                            stroke: '#388E3C',
                            strokeWidth: 2
                        },
                        label: {
                            text: '开始',
                            fill: '#fff',
                            fontSize: 13,
                            fontWeight: 'bold'
                        }
                    }
                });
                node.set('nodeType', 'start');
                break;

            case 'end':
                node = new joint.shapes.standard.Ellipse({
                    position: { x: x, y: y },
                    size: { width: 100, height: 50 },
                    attrs: {
                        body: {
                            fill: '#BD1C22',
                            stroke: '#8B0000',
                            strokeWidth: 2
                        },
                        label: {
                            text: '结束',
                            fill: '#fff',
                            fontSize: 13,
                            fontWeight: 'bold'
                        }
                    }
                });
                node.set('nodeType', 'end');
                break;

            case 'action':
                node = new joint.shapes.standard.Rectangle({
                    position: { x: x, y: y },
                    size: { width: 140, height: 50 },
                    attrs: {
                        body: {
                            fill: '#2196F3',
                            stroke: '#1565C0',
                            strokeWidth: 2,
                            rx: 4,
                            ry: 4
                        },
                        label: {
                            text: 'robot.move_to()',
                            fill: '#fff',
                            fontSize: 11
                        }
                    }
                });
                node.set('nodeType', 'action');
                node.set('actionData', { actionType: 'move_to', params: {} });
                break;

            case 'decision':
                node = new joint.shapes.standard.Polygon({
                    position: { x: x, y: y },
                    size: { width: 120, height: 80 },
                    attrs: {
                        body: {
                            refPoints: '60,0 120,40 60,80 0,40',
                            fill: '#FF9800',
                            stroke: '#E65100',
                            strokeWidth: 2
                        },
                        label: {
                            text: '条件判断',
                            fill: '#fff',
                            fontSize: 11
                        }
                    }
                });
                node.set('nodeType', 'decision');
                node.set('conditionData', { condition: 'True' });
                break;

            default:
                return null;
        }

        this.graph.addCell(node);
        return node;
    }

    _setupStencil() {
        var stencilItems = document.querySelectorAll('.ae-stencil-item');
        var self = this;

        stencilItems.forEach(function(item) {
            item.addEventListener('mousedown', function(e) {
                var shape = item.dataset.shape;
                var ghost = document.createElement('div');
                ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:10000;opacity:0.7;';
                ghost.textContent = item.textContent;
                ghost.style.padding = '6px 12px';
                ghost.style.borderRadius = '4px';
                ghost.style.color = '#fff';
                ghost.style.fontSize = '12px';

                switch (shape) {
                    case 'start': ghost.style.background = '#4CAF50'; break;
                    case 'end': ghost.style.background = '#BD1C22'; break;
                    case 'action': ghost.style.background = '#2196F3'; break;
                    case 'decision': ghost.style.background = '#FF9800'; break;
                }

                ghost.style.left = e.clientX + 'px';
                ghost.style.top = e.clientY + 'px';
                document.body.appendChild(ghost);

                function onMouseMove(e2) {
                    ghost.style.left = e2.clientX + 'px';
                    ghost.style.top = e2.clientY + 'px';
                }

                function onMouseUp(e2) {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    document.body.removeChild(ghost);

                    var rect = self.paper.el.getBoundingClientRect();
                    if (e2.clientX >= rect.left && e2.clientX <= rect.right &&
                        e2.clientY >= rect.top && e2.clientY <= rect.bottom) {
                        var x = e2.clientX - rect.left - 50 + self.paper.translate().tx;
                        var y = e2.clientY - rect.top - 25 + self.paper.translate().ty;
                        self._createNode(shape, x, y);
                    }
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    _setupDoubleClick() {
        var self = this;
        this.paper.on('element:pointerclick', function(cellView) {
            var cell = cellView.model;
            var nodeType = cell.get('nodeType');

            if (nodeType === 'action') {
                var currentLabel = cell.attr('label/text') || 'robot.action()';
                var newLabel = prompt('编辑动作指令:', currentLabel);
                if (newLabel !== null && newLabel.trim()) {
                    cell.attr('label/text', newLabel);
                    cell.set('actionData', { actionType: newLabel });
                }
            } else if (nodeType === 'decision') {
                var currentCond = cell.attr('label/text') || '条件判断';
                var newCond = prompt('编辑条件:', currentCond);
                if (newCond !== null && newCond.trim()) {
                    cell.attr('label/text', newCond);
                    cell.set('conditionData', { condition: newCond });
                }
            }
        });
    }

    _addDefaultNodes() {
        var startNode = this._createNode('start', 50, 150);
        var endNode = this._createNode('end', 50, 400);

        var link = new joint.shapes.standard.Link({
            source: { id: startNode.id },
            target: { id: endNode.id },
            attrs: {
                line: {
                    stroke: '#888',
                    strokeWidth: 2,
                    targetMarker: {
                        type: 'path',
                        d: 'M 10 -5 0 0 10 5 Z',
                        fill: '#888'
                    }
                }
            }
        });
        this.graph.addCell(link);
    }

    getPythonCode() {
        if (!this.graph) return '# Flowchart graph not available';
        return generatePythonFromGraph(this.graph);
    }

    clear() {
        if (this.graph) {
            this.graph.clear();
            this.nodeCount = 0;
            this._addDefaultNodes();
        }
    }

    autoLayout() {
        if (!this.graph || !this.graph.getCells().length) return;

        var cells = this.graph.getCells();
        var elements = cells.filter(function(c) { return c.isElement(); });
        var links = cells.filter(function(c) { return c.isLink(); });

        // Simple top-to-bottom layout
        elements.sort(function(a, b) {
            return a.position().y - b.position().y;
        });

        var y = 30;
        var centerX = (this.paper.options.width || 400) / 2;
        elements.forEach(function(el) {
            var size = el.size();
            el.position(centerX - size.width / 2, y);
            y += size.height + 40;
        });
    }

    zoomIn() {
        if (!this.paper) return;
        this.zoomLevel = Math.min(this.zoomLevel * 1.2, 3);
        this.paper.scale(this.zoomLevel);
    }

    zoomOut() {
        if (!this.paper) return;
        this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.3);
        this.paper.scale(this.zoomLevel);
    }

    resize() {
        if (!this.paper || !this.container) return;
        var rect = this.container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            this.paper.setDimensions(rect.width, rect.height);
        }
    }

    dispose() {
        if (this.paper) {
            this.paper.remove();
            this.paper = null;
        }
        if (this.graph) {
            this.graph.clear();
            this.graph = null;
        }
    }
}

export { FlowchartEditor };
