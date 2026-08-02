const MODEL_POINTS = {
    Z_EFG_8S_1: [0, 0.32, 0]
};

const COLOR = {
    body: [0.52, 0.56, 0.57],
    bodyLight: [0.68, 0.71, 0.7],
    bodyDark: [0.36, 0.4, 0.42],
    jaw: [0.62, 0.65, 0.64]
};

const DEFAULT_CAMERA = {
    eye: [4.35, 2.7, 4.05],
    target: [0.1, 0.18, 0.02],
    up: [0, 1, 0],
    yaw: 0.8,
    pitch: -0.4,
    distance: 6.4
};

export function initSimpleWebGLScene() {
    const canvas = document.querySelector('[data-webgl-scene]');
    const viewport = canvas?.closest('.viewport-3d');
    if (!canvas || !viewport) return null;

    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) {
        viewport.classList.add('webgl-unavailable');
        return null;
    }

    const program = createProgram(gl);
    const attributes = {
        position: gl.getAttribLocation(program, 'aPosition'),
        normal: gl.getAttribLocation(program, 'aNormal')
    };
    const uniforms = {
        matrix: gl.getUniformLocation(program, 'uMatrix'),
        normalMatrix: gl.getUniformLocation(program, 'uNormalMatrix'),
        color: gl.getUniformLocation(program, 'uColor')
    };
    const meshes = {
        box: createMesh(gl, makeBox(1, 1, 1)),
        cylinder: createMesh(gl, makeCylinder(1, 1, 40))
    };
    const camera = {
        eye: [...DEFAULT_CAMERA.eye],
        yaw: DEFAULT_CAMERA.yaw,
        pitch: DEFAULT_CAMERA.pitch,
        distance: DEFAULT_CAMERA.distance,
        target: [...DEFAULT_CAMERA.target]
    };
    let raf = 0;
    const state = {
        projection: identity(),
        view: identity(),
        viewProjection: identity()
    };

    viewport.classList.add('webgl-ready');
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    const rangeEditor = setupGripperRangeEditor(viewport, canvas);
    const cleanupViewInteractions = setupCanvasViewInteractions(canvas, camera, render);
    const cleanupContextMenu = setupSceneContextMenu(viewport, canvas, rangeEditor);
    const cleanupSceneDrop = setupSceneDrop(viewport, render);
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(viewport);

    function render() {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
    }

    function draw() {
        const width = Math.max(1, viewport.clientWidth);
        const height = Math.max(1, viewport.clientHeight);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetWidth = Math.floor(width * dpr);
        const targetHeight = Math.floor(height * dpr);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        state.projection = perspective(Math.PI / 4, width / height, 0.1, 100);
        state.view = lookAt(camera.eye, camera.target, DEFAULT_CAMERA.up);
        state.viewProjection = multiply(state.projection, state.view);

        drawGripperScene(drawPart);
        positionSceneLabels(width, height);
        rangeEditor.update(state.viewProjection, width, height);
    }

    function drawPart(kind, position, scale, color, rotation = [0, 0, 0]) {
        const mesh = meshes[kind];
        const model = compose(position, rotation, scale);
        const matrix = multiply(state.viewProjection, model);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
        gl.enableVertexAttribArray(attributes.position);
        gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(attributes.normal);
        gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 24, 12);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.uniformMatrix4fv(uniforms.matrix, false, matrix);
        gl.uniformMatrix4fv(uniforms.normalMatrix, false, model);
        gl.uniform3fv(uniforms.color, color);
        gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    function positionSceneLabels(width, height) {
        viewport.querySelectorAll('[data-scene-model-name]').forEach((object) => {
            const modelKey = object.dataset.sceneModelName.replace(/-/g, '_');
            const point = MODEL_POINTS[modelKey];
            if (point) {
                const screen = project(point, state.viewProjection, width, height);
                object.style.left = `${screen.x}px`;
                object.style.top = `${screen.y}px`;
                object.style.zIndex = String(Math.round(1000 - screen.z * 100));
                return;
            }

            if (object.dataset.sceneX && object.dataset.sceneY) {
                object.style.left = `${Number(object.dataset.sceneX) * width}px`;
                object.style.top = `${Number(object.dataset.sceneY) * height}px`;
            }
        });
    }

    render();

    return {
        dispose() {
            cancelAnimationFrame(raf);
            cleanupViewInteractions();
            cleanupContextMenu();
            cleanupSceneDrop();
            rangeEditor.dispose();
            resizeObserver.disconnect();
            viewport.classList.remove('webgl-ready');
        },
        render
    };
}

function setupSceneContextMenu(viewport, canvas, rangeEditor) {
    const menu = document.createElement('div');
    menu.className = 'gripper-context-menu hidden';
    menu.innerHTML = `
        <div class="gripper-context-menu-title" data-scene-menu-title>未选择模型</div>
        <button type="button" data-gripper-menu-action="add-cart"><i class="bi bi-cart-plus" aria-hidden="true"></i><span data-scene-cart-action-label>加入购物车</span></button>
        <button type="button" data-gripper-menu-action="range"><i class="bi bi-arrows-expand" aria-hidden="true"></i><span>夹取范围调整</span></button>
        <div class="gripper-context-menu-hint" data-scene-menu-hint></div>
    `;

    const panel = document.createElement('div');
    panel.className = 'gripper-range-panel hidden';
    panel.innerHTML = `
        <div class="gripper-range-panel-header">
            <span>机械臂面板</span>
            <button type="button" aria-label="关闭机械臂面板" data-gripper-panel-close>×</button>
        </div>
        <div class="gripper-range-panel-body" data-gripper-range-panel-body></div>
    `;

    viewport.append(menu, panel);
    rangeEditor.attachPanel(panel.querySelector('[data-gripper-range-panel-body]'));
    const sceneObjects = viewport.querySelector('.scene-objects');
    const addCartButton = menu.querySelector('[data-gripper-menu-action="add-cart"]');
    const rangeButton = menu.querySelector('[data-gripper-menu-action="range"]');
    const title = menu.querySelector('[data-scene-menu-title]');
    const hint = menu.querySelector('[data-scene-menu-hint]');
    const addCartLabel = menu.querySelector('[data-scene-cart-action-label]');
    let selectedObject = null;

    const hideMenu = () => menu.classList.add('hidden');

    const selectObject = (object) => {
        if (selectedObject && selectedObject !== object) {
            selectedObject.classList.remove('is-selected');
        }
        selectedObject = object || null;
        selectedObject?.classList.add('is-selected');
    };

    const updateMenuState = () => {
        const cart = window.HitbotCart;
        const displayName = selectedObject?.dataset.sceneDisplayName
            || selectedObject?.dataset.sceneModelName
            || '未选择模型';
        const cartState = cart?.getSceneObjectCartState?.(selectedObject) || {
            canAdd: false,
            reason: selectedObject ? '该模型暂不支持加入购物车' : '请先选择一个场景模型'
        };

        title.textContent = displayName;
        addCartButton.disabled = !cartState.canAdd;
        addCartLabel.textContent = cartState.inCart ? '已在购物车' : '加入购物车';
        rangeButton.disabled = selectedObject?.dataset.objectType !== 'gripper';
        hint.textContent = cartState.canAdd ? '按当前场景参数加入' : cartState.reason;
        hint.hidden = !hint.textContent;
    };

    const showMenu = (event) => {
        if (event.target.closest('.gripper-context-menu')) return;
        event.preventDefault();
        const targetObject = event.target.closest('.scene-object');
        if (targetObject) selectObject(targetObject);
        const rect = viewport.getBoundingClientRect();
        updateMenuState();
        menu.style.left = `${Math.max(4, Math.min(event.clientX - rect.left, rect.width - 188))}px`;
        menu.style.top = `${Math.max(4, Math.min(event.clientY - rect.top, rect.height - 156))}px`;
        menu.classList.remove('hidden');
    };

    const onMenuClick = (event) => {
        const action = event.target.closest('[data-gripper-menu-action]')?.dataset.gripperMenuAction;
        if (!action) return;
        if (action === 'add-cart') {
            const result = window.HitbotCart?.addSceneObject?.(selectedObject);
            if (result?.ok) hideMenu();
            else updateMenuState();
            return;
        }
        if (action === 'range') {
            hideMenu();
            panel.classList.remove('hidden');
            rangeEditor.show();
        }
    };

    const onScenePointerDown = (event) => {
        const object = event.target.closest('.scene-object');
        if (object && event.button === 0) selectObject(object);
    };

    const onDocumentPointerDown = (event) => {
        if (event.target.closest('.gripper-context-menu')) return;
        hideMenu();
    };

    const onPanelClose = () => {
        panel.classList.add('hidden');
        rangeEditor.hide();
    };

    viewport.addEventListener('contextmenu', showMenu);
    sceneObjects?.addEventListener('pointerdown', onScenePointerDown);
    menu.addEventListener('click', onMenuClick);
    document.addEventListener('pointerdown', onDocumentPointerDown);
    panel.querySelector('[data-gripper-panel-close]').addEventListener('click', onPanelClose);

    return () => {
        viewport.removeEventListener('contextmenu', showMenu);
        sceneObjects?.removeEventListener('pointerdown', onScenePointerDown);
        menu.removeEventListener('click', onMenuClick);
        document.removeEventListener('pointerdown', onDocumentPointerDown);
        rangeEditor.hide();
        rangeEditor.attachPanel(null);
        panel.remove();
        menu.remove();
    };
}

function setupSceneDrop(viewport, render) {
    const sceneObjects = viewport.querySelector('.scene-objects');
    if (!sceneObjects) return () => {};

    const onDragOver = (event) => {
        if (!event.dataTransfer?.types?.includes('deviceId')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        viewport.classList.add('scene-drop-active');
    };

    const onDragLeave = (event) => {
        if (event.relatedTarget && viewport.contains(event.relatedTarget)) return;
        viewport.classList.remove('scene-drop-active');
    };

    const onDrop = (event) => {
        const deviceId = event.dataTransfer?.getData('deviceId');
        if (!deviceId) return;

        event.preventDefault();
        viewport.classList.remove('scene-drop-active');
        const productId = event.dataTransfer.getData('productId');
        const deviceName = event.dataTransfer.getData('deviceName') || deviceId;
        const rect = viewport.getBoundingClientRect();
        const objectId = `scene-${slugify(deviceId)}-${Date.now().toString(36)}`;
        const object = document.createElement('div');
        const label = document.createElement('span');
        const marker = document.createElement('div');

        object.className = 'scene-object is-selected';
        object.dataset.sceneObjectId = objectId;
        object.dataset.sceneModelName = `${deviceName}_${Date.now().toString(36).slice(-4)}`;
        object.dataset.sceneDisplayName = deviceName;
        object.dataset.objectType = 'device';
        object.dataset.sceneX = String(clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0.08, 0.92));
        object.dataset.sceneY = String(clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0.12, 0.88));
        object.dataset.cartDynamic = 'true';
        if (productId) object.dataset.productId = productId;

        const cartParameters = event.dataTransfer.getData('cartParameters');
        if (cartParameters) object.dataset.cartParameters = cartParameters;

        marker.className = 'object-3d box';
        label.className = 'object-label';
        label.textContent = object.dataset.sceneModelName;
        object.append(marker, label);
        sceneObjects.querySelectorAll('.scene-object.is-selected').forEach((item) => item.classList.remove('is-selected'));
        sceneObjects.appendChild(object);
        render();
        window.dispatchEvent(new CustomEvent('hitbot:scene-changed', {
            detail: { type: 'added', sceneObjectId: objectId }
        }));
    };

    viewport.addEventListener('dragover', onDragOver);
    viewport.addEventListener('dragleave', onDragLeave);
    viewport.addEventListener('drop', onDrop);

    return () => {
        viewport.removeEventListener('dragover', onDragOver);
        viewport.removeEventListener('dragleave', onDragLeave);
        viewport.removeEventListener('drop', onDrop);
        viewport.classList.remove('scene-drop-active');
    };
}

function slugify(value) {
    return String(value || 'device')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 28) || 'device';
}

function setupGripperRangeEditor(viewport, canvas) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const overlay = document.createElementNS(svgNS, 'svg');
    overlay.classList.add('gripper-range-overlay', 'hidden');
    overlay.setAttribute('aria-hidden', 'true');

    const boxes = {
        left: { backX: 0.92, length: 1.46, minZ: -0.96, maxZ: -0.62, minBound: -1.28, maxBound: -0.28 },
        right: { backX: 0.92, length: 1.46, minZ: 0.62, maxZ: 0.96, minBound: 0.28, maxBound: 1.28 }
    };
    const boxStyle = {
        centerY: 0.28,
        height: 0.32,
        depth: 0.32
    };
    const edges = [
        [0, 1], [1, 3], [3, 2], [2, 0],
        [4, 5], [5, 7], [7, 6], [6, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    const parts = {};
    let latestProjection = identity();
    let latestSize = { width: 1, height: 1 };
    let drag = null;
    let panelBody = null;
    let isRenderingPanel = false;
    let activeTarget = null;

    Object.keys(boxes).forEach((side) => {
        const group = document.createElementNS(svgNS, 'g');
        const faces = {
            minZ: document.createElementNS(svgNS, 'polygon'),
            maxZ: document.createElementNS(svgNS, 'polygon')
        };
        Object.entries(faces).forEach(([face, polygon]) => {
            polygon.classList.add('gripper-range-face');
            polygon.dataset.rangeSide = side;
            polygon.dataset.rangeFace = face;
            group.append(polygon);
        });
        const lines = edges.map(() => {
            const line = document.createElementNS(svgNS, 'line');
            line.classList.add('gripper-range-line');
            group.append(line);
            return line;
        });
        overlay.append(group);
        parts[side] = { group, lines, faces, lastMinCenter: null, lastMaxCenter: null };
    });

    viewport.append(overlay);

    const getCorners = (box) => {
        const y0 = boxStyle.centerY - boxStyle.height / 2;
        const y1 = boxStyle.centerY + boxStyle.height / 2;
        const z0 = box.minZ;
        const z1 = box.maxZ;
        const x0 = box.backX;
        const x1 = box.backX + box.length;
        return [
            [x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0],
            [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1]
        ];
    };

    const update = (viewProjection, width, height) => {
        latestProjection = viewProjection;
        latestSize = { width, height };
        renderPanel();
        if (overlay.classList.contains('hidden')) return;

        overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
        overlay.setAttribute('width', String(width));
        overlay.setAttribute('height', String(height));

        Object.entries(boxes).forEach(([side, box]) => {
            const corners = getCorners(box).map((point) => project(point, viewProjection, width, height));
            edges.forEach(([from, to], index) => {
                const line = parts[side].lines[index];
                line.setAttribute('x1', corners[from].x);
                line.setAttribute('y1', corners[from].y);
                line.setAttribute('x2', corners[to].x);
                line.setAttribute('y2', corners[to].y);
            });

            parts[side].faces.minZ.setAttribute('points', polygonPoints(corners, [0, 1, 3, 2]));
            parts[side].faces.maxZ.setAttribute('points', polygonPoints(corners, [4, 5, 7, 6]));
            parts[side].lastMinCenter = project([box.backX + box.length / 2, boxStyle.centerY, box.minZ], viewProjection, width, height);
            parts[side].lastMaxCenter = project([box.backX + box.length / 2, boxStyle.centerY, box.maxZ], viewProjection, width, height);
        });
    };

    const toMm = (value) => Math.round(value * 1000);
    const fromMm = (value) => Number(value) / 1000;

    const getMetrics = (side) => {
        const box = boxes[side];
        if (side === 'left') {
            return {
                inner: box.maxZ,
                outer: box.minZ,
                width: box.maxZ - box.minZ
            };
        }
        return {
            inner: box.minZ,
            outer: box.maxZ,
            width: box.maxZ - box.minZ
        };
    };

    const edgeFromFace = (side, face) => {
        if (side === 'left') return face === 'maxZ' ? 'inner' : 'outer';
        return face === 'minZ' ? 'inner' : 'outer';
    };

    const setActiveTarget = (target) => {
        activeTarget = target;
        Object.entries(parts).forEach(([side, part]) => {
            const isActiveSide = target?.side === side;
            part.group.classList.toggle('is-range-active', isActiveSide);
            Object.entries(part.faces).forEach(([face, polygon]) => {
                const isActiveFace = isActiveSide && edgeFromFace(side, face) === target.edge;
                polygon.classList.toggle('is-range-active', isActiveFace);
            });
        });

        panelBody?.querySelectorAll('[data-range-side][data-range-edge]').forEach((element) => {
            const isActiveInput = element.dataset.rangeSide === target?.side
                && element.dataset.rangeEdge === target?.edge;
            element.classList.toggle('is-range-active', isActiveInput);
        });
    };

    const renderPanel = () => {
        if (!panelBody || isRenderingPanel) return;
        const active = document.activeElement;
        if (active?.matches?.('[data-range-side][data-range-edge]')) return;

        const leftMetrics = getMetrics('left');
        const rightMetrics = getMetrics('right');

        isRenderingPanel = true;
        panelBody.innerHTML = `
            <div class="gripper-range-table">
                <div class="gripper-range-unit-head">
                    <span>夹爪</span>
                    <strong>左 ${toMm(leftMetrics.width)} mm / 右 ${toMm(rightMetrics.width)} mm</strong>
                </div>

                <span></span>
                <span class="gripper-range-column-label">左侧</span>
                <span class="gripper-range-column-label">右侧</span>

                <span class="gripper-range-row-label">内侧边界</span>
                <span class="gripper-range-input-wrap" data-range-side="left" data-range-edge="inner">
                    <input type="number" step="1" value="${toMm(leftMetrics.inner)}" aria-label="左夹爪内侧边界 mm" data-range-side="left" data-range-edge="inner">
                    <em>mm</em>
                </span>
                <span class="gripper-range-input-wrap" data-range-side="right" data-range-edge="inner">
                    <input type="number" step="1" value="${toMm(rightMetrics.inner)}" aria-label="右夹爪内侧边界 mm" data-range-side="right" data-range-edge="inner">
                    <em>mm</em>
                </span>

                <span class="gripper-range-row-label">外侧边界</span>
                <span class="gripper-range-input-wrap" data-range-side="left" data-range-edge="outer">
                    <input type="number" step="1" value="${toMm(leftMetrics.outer)}" aria-label="左夹爪外侧边界 mm" data-range-side="left" data-range-edge="outer">
                    <em>mm</em>
                </span>
                <span class="gripper-range-input-wrap" data-range-side="right" data-range-edge="outer">
                    <input type="number" step="1" value="${toMm(rightMetrics.outer)}" aria-label="右夹爪外侧边界 mm" data-range-side="right" data-range-edge="outer">
                    <em>mm</em>
                </span>
            </div>
        `;
        isRenderingPanel = false;
        if (activeTarget) setActiveTarget(activeTarget);
    };

    const applyPanelValue = (input) => {
        const side = input.dataset.rangeSide;
        const edge = input.dataset.rangeEdge;
        const value = fromMm(input.value);
        const box = boxes[side];
        const minDepth = 0.16;
        if (!box || !Number.isFinite(value)) {
            renderPanel();
            return;
        }

        if (side === 'left') {
            if (edge === 'inner') {
                box.maxZ = clamp(value, box.minZ + minDepth, box.maxBound);
            } else {
                box.minZ = clamp(value, box.minBound, box.maxZ - minDepth);
            }
        } else if (edge === 'inner') {
            box.minZ = clamp(value, box.minBound, box.maxZ - minDepth);
        } else {
            box.maxZ = clamp(value, box.minZ + minDepth, box.maxBound);
        }

        update(latestProjection, latestSize.width, latestSize.height);
    };

    const onPanelInput = (event) => {
        const input = event.target.closest('[data-range-side][data-range-edge]');
        if (!input) return;
        applyPanelValue(input);
    };

    const onPanelChange = () => {
        renderPanel();
    };

    const onPanelPointerOver = (event) => {
        const control = event.target.closest('.gripper-range-input-wrap');
        if (!control) return;
        setActiveTarget({
            side: control.dataset.rangeSide,
            edge: control.dataset.rangeEdge
        });
    };

    const onPanelPointerOut = (event) => {
        const fromControl = event.target.closest('.gripper-range-input-wrap');
        const toControl = event.relatedTarget?.closest?.('.gripper-range-input-wrap');
        if (!fromControl || toControl || drag) return;
        setActiveTarget(null);
    };

    const onOverlayPointerOver = (event) => {
        const faceEl = event.target.closest('.gripper-range-face');
        if (!faceEl || drag) return;
        setActiveTarget({
            side: faceEl.dataset.rangeSide,
            edge: edgeFromFace(faceEl.dataset.rangeSide, faceEl.dataset.rangeFace)
        });
    };

    const onOverlayPointerOut = (event) => {
        const fromFace = event.target.closest('.gripper-range-face');
        const toFace = event.relatedTarget?.closest?.('.gripper-range-face');
        if (!fromFace || toFace || drag) return;
        setActiveTarget(null);
    };

    const onPointerDown = (event) => {
        const faceEl = event.target.closest('.gripper-range-face');
        if (!faceEl) return;
        event.preventDefault();
        event.stopPropagation();
        const side = faceEl.dataset.rangeSide;
        const face = faceEl.dataset.rangeFace;
        const part = parts[side];
        setActiveTarget({ side, edge: edgeFromFace(side, face) });
        const axisX = part.lastMaxCenter.x - part.lastMinCenter.x;
        const axisY = part.lastMaxCenter.y - part.lastMinCenter.y;
        const axisLength = Math.hypot(axisX, axisY) || 1;
        drag = {
            side,
            face,
            startX: event.clientX,
            startY: event.clientY,
            startMinZ: boxes[side].minZ,
            startMaxZ: boxes[side].maxZ,
            axisX: axisX / axisLength,
            axisY: axisY / axisLength,
            worldPerPixel: (boxes[side].maxZ - boxes[side].minZ) / axisLength
        };
        faceEl.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event) => {
        if (!drag) return;
        event.preventDefault();
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        const delta = (dx * drag.axisX + dy * drag.axisY) * drag.worldPerPixel;
        const box = boxes[drag.side];
        const minDepth = 0.16;
        if (drag.face === 'minZ') {
            box.minZ = clamp(drag.startMinZ + delta, box.minBound, drag.startMaxZ - minDepth);
        } else {
            box.maxZ = clamp(drag.startMaxZ + delta, drag.startMinZ + minDepth, box.maxBound);
        }
        renderPanel();
        update(latestProjection, latestSize.width, latestSize.height);
    };

    const onPointerUp = (event) => {
        if (!drag) return;
        const faceEl = event.target.closest('.gripper-range-face');
        if (faceEl?.hasPointerCapture(event.pointerId)) {
            faceEl.releasePointerCapture(event.pointerId);
        }
        drag = null;
        setActiveTarget(null);
    };

    overlay.addEventListener('pointerover', onOverlayPointerOver);
    overlay.addEventListener('pointerout', onOverlayPointerOut);
    overlay.addEventListener('pointerdown', onPointerDown);
    overlay.addEventListener('pointermove', onPointerMove);
    overlay.addEventListener('pointerup', onPointerUp);
    overlay.addEventListener('pointercancel', onPointerUp);

    return {
        show() {
            overlay.classList.remove('hidden');
            renderPanel();
            update(latestProjection, latestSize.width, latestSize.height);
        },
        hide() {
            overlay.classList.add('hidden');
            drag = null;
            setActiveTarget(null);
        },
        attachPanel(nextPanelBody) {
            if (panelBody) {
                panelBody.removeEventListener('input', onPanelInput);
                panelBody.removeEventListener('change', onPanelChange);
                panelBody.removeEventListener('pointerover', onPanelPointerOver);
                panelBody.removeEventListener('pointerout', onPanelPointerOut);
            }
            panelBody = nextPanelBody;
            if (panelBody) {
                panelBody.addEventListener('input', onPanelInput);
                panelBody.addEventListener('change', onPanelChange);
                panelBody.addEventListener('pointerover', onPanelPointerOver);
                panelBody.addEventListener('pointerout', onPanelPointerOut);
                renderPanel();
            }
        },
        update,
        dispose() {
            if (panelBody) {
                panelBody.removeEventListener('input', onPanelInput);
                panelBody.removeEventListener('change', onPanelChange);
                panelBody.removeEventListener('pointerover', onPanelPointerOver);
                panelBody.removeEventListener('pointerout', onPanelPointerOut);
            }
            overlay.removeEventListener('pointerover', onOverlayPointerOver);
            overlay.removeEventListener('pointerout', onOverlayPointerOut);
            overlay.removeEventListener('pointerdown', onPointerDown);
            overlay.removeEventListener('pointermove', onPointerMove);
            overlay.removeEventListener('pointerup', onPointerUp);
            overlay.removeEventListener('pointercancel', onPointerUp);
            overlay.remove();
        }
    };
}

function polygonPoints(points, indexes) {
    return indexes.map((index) => `${points[index].x},${points[index].y}`).join(' ');
}

function setupCanvasViewInteractions(canvas, camera, render) {
    const pointer = {
        active: false,
        x: 0,
        y: 0
    };

    const onPointerDown = (event) => {
        if (event.button !== 0) return;
        pointer.active = true;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event) => {
        if (!pointer.active) return;
        const dx = event.clientX - pointer.x;
        const dy = event.clientY - pointer.y;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        camera.yaw -= dx * 0.008;
        camera.pitch = clamp(camera.pitch - dy * 0.006, -1.25, 1.1);
        camera.eye = getCameraEye(camera);
        render();
    };

    const onPointerUp = (event) => {
        pointer.active = false;
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    };

    const onWheel = (event) => {
        event.preventDefault();
        camera.distance = clamp(camera.distance * Math.exp(event.deltaY * 0.001), 3.4, 10.5);
        camera.eye = getCameraEye(camera);
        render();
    };

    const onDoubleClick = () => {
        camera.yaw = DEFAULT_CAMERA.yaw;
        camera.pitch = DEFAULT_CAMERA.pitch;
        camera.distance = DEFAULT_CAMERA.distance;
        camera.target = [...DEFAULT_CAMERA.target];
        camera.eye = [...DEFAULT_CAMERA.eye];
        render();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDoubleClick);

    return () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('dblclick', onDoubleClick);
    };
}

function drawGripperScene(drawPart) {
    drawPart('box', [-1.03, 0.28, 0], [1.35, 0.6, 0.68], COLOR.body);
    drawPart('box', [-1.03, 0.65, 0], [0.85, 0.12, 0.44], COLOR.bodyLight);
    drawPart('box', [-0.28, 0.28, 0], [0.22, 0.64, 0.78], COLOR.bodyDark);
    drawPart('cylinder', [-0.03, 0.28, 0], [0.36, 0.12, 0.36], COLOR.bodyLight, [0, 0, Math.PI / 2]);
    drawPart('box', [0.42, 0.28, 0], [0.58, 0.42, 0.52], COLOR.bodyLight);

    drawPart('box', [0.78, 0.28, -0.48], [0.18, 0.2, 0.64], COLOR.jaw);
    drawPart('box', [1.58, 0.28, -0.78], [1.32, 0.2, 0.22], COLOR.jaw);
    drawPart('box', [0.78, 0.28, 0.48], [0.18, 0.2, 0.64], COLOR.jaw);
    drawPart('box', [1.58, 0.28, 0.78], [1.32, 0.2, 0.22], COLOR.jaw);
}

function createProgram(gl) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        uniform mat4 uMatrix;
        uniform mat4 uNormalMatrix;
        varying vec3 vNormal;
        void main() {
            gl_Position = uMatrix * vec4(aPosition, 1.0);
            vNormal = mat3(uNormalMatrix) * aNormal;
        }
    `);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform vec3 uColor;
        varying vec3 vNormal;
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 light = normalize(vec3(0.35, 0.82, 0.46));
            float diffuse = max(dot(normal, light), 0.0);
            vec3 color = uColor * (0.34 + diffuse * 0.66);
            gl_FragColor = vec4(color, 1.0);
        }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createMesh(gl, data) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertices), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);

    return { vertexBuffer, indexBuffer, indexCount: data.indices.length };
}

function makeBox(width, height, depth) {
    const x = width / 2;
    const y = height / 2;
    const z = depth / 2;
    const faces = [
        [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1]],
        [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1]],
        [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0]],
        [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0]],
        [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z], [0, 1, 0]],
        [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [0, -1, 0]]
    ];
    const vertices = [];
    const indices = [];
    faces.forEach((face, faceIndex) => {
        const start = faceIndex * 4;
        const normal = face[4];
        face.slice(0, 4).forEach((position) => vertices.push(...position, ...normal));
        indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    });
    return { vertices, indices };
}

function makeCylinder(radius, height, segments) {
    const vertices = [];
    const indices = [];
    const half = height / 2;

    for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        vertices.push(x, -half, z, x, 0, z, x, half, z, x, 0, z);
    }

    for (let i = 0; i < segments; i += 1) {
        const start = i * 2;
        indices.push(start, start + 1, start + 3, start, start + 3, start + 2);
    }

    const topCenter = vertices.length / 6;
    vertices.push(0, half, 0, 0, 1, 0);
    const bottomCenter = vertices.length / 6;
    vertices.push(0, -half, 0, 0, -1, 0);

    for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        vertices.push(x, half, z, 0, 1, 0, x, -half, z, 0, -1, 0);
    }

    const capStart = bottomCenter + 1;
    for (let i = 0; i < segments; i += 1) {
        const top = capStart + i * 2;
        const nextTop = capStart + (i + 1) * 2;
        const bottom = top + 1;
        const nextBottom = nextTop + 1;
        indices.push(topCenter, top, nextTop);
        indices.push(bottomCenter, nextBottom, bottom);
    }

    return { vertices, indices };
}

function identity() {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2);
    const range = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (near + far) * range, -1, 0, 0, near * far * range * 2, 0];
}

function lookAt(eye, target, up) {
    const z = normalize(subtract(eye, target));
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
}

function multiply(a, b) {
    const out = new Array(16);
    for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
            out[col * 4 + row] =
                a[0 * 4 + row] * b[col * 4 + 0] +
                a[1 * 4 + row] * b[col * 4 + 1] +
                a[2 * 4 + row] * b[col * 4 + 2] +
                a[3 * 4 + row] * b[col * 4 + 3];
        }
    }
    return out;
}

function compose(position, rotation, scale) {
    const [sx, sy, sz] = scale;
    const [rx, ry, rz] = rotation;
    const cx = Math.cos(rx);
    const sxr = Math.sin(rx);
    const cy = Math.cos(ry);
    const syr = Math.sin(ry);
    const cz = Math.cos(rz);
    const szr = Math.sin(rz);
    const rxm = [1, 0, 0, 0, 0, cx, sxr, 0, 0, -sxr, cx, 0, 0, 0, 0, 1];
    const rym = [cy, 0, -syr, 0, 0, 1, 0, 0, syr, 0, cy, 0, 0, 0, 0, 1];
    const rzm = [cz, szr, 0, 0, -szr, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const sm = [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1];
    const tm = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, position[0], position[1], position[2], 1];
    return multiply(tm, multiply(rzm, multiply(rym, multiply(rxm, sm))));
}

function project(point, matrix, width, height) {
    const x = point[0];
    const y = point[1];
    const z = point[2];
    const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
    const nx = (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w;
    const ny = (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w;
    const nz = (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w;
    return {
        x: (nx * 0.5 + 0.5) * width,
        y: (-ny * 0.5 + 0.5) * height,
        z: nz
    };
}

function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v) {
    const length = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
}

function getCameraEye(camera) {
    const cp = Math.cos(camera.pitch);
    const sp = Math.sin(camera.pitch);
    const cy = Math.cos(camera.yaw);
    const sy = Math.sin(camera.yaw);
    return [
        camera.target[0] + camera.distance * sy * cp,
        camera.target[1] + camera.distance * -sp,
        camera.target[2] + camera.distance * cy * cp
    ];
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
