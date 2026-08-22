(function () {
    const STORAGE_KEY = 'hitbot-scene-program-v2';
    const RUN_STEP_DURATION = 720;
    const WAIT_STEP_DURATION = 1150;

    const instructionMeta = {
        moveJ: { label: '关节运动', code: 'MoveJ', icon: 'bi-bezier2', kind: '运动指令' },
        moveL: { label: '直线运动', code: 'MoveL', icon: 'bi-arrow-up-right', kind: '运动指令' },
        setIO: { label: '设置 IO 状态', code: 'Set IO', icon: 'bi-toggles', kind: '设备指令' },
        wait: { label: '等待条件', code: 'Wait', icon: 'bi-hourglass-split', kind: '控制指令' },
        setVar: { label: '设置变量', code: 'Set', icon: 'bi-pencil-square', kind: '控制指令' },
        loop: { label: '循环', code: 'Loop', icon: 'bi-arrow-repeat', kind: '控制指令' },
        call: { label: '调用函数', code: 'Call', icon: 'bi-box-arrow-in-right', kind: '函数指令' }
    };

    const VARIABLE_TYPES = ['Bool', 'Int', 'Double', 'String'];

    function defaultValueForType(type) {
        if (type === 'Int' || type === 'Double') return 0;
        if (type === 'String') return '';
        return false;
    }

    function makeId(prefix) {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    function createInstruction(type, overrides = {}) {
        const defaults = {
            moveJ: { target: 'P0', speed: 50, acceleration: 50, smoothing: 30 },
            moveL: { target: 'P1', speed: 35, acceleration: 40, smoothing: 20 },
            setIO: { device: 'Z-EFG-8S$12', node: '旋转节点', parameterType: 'Bool', value: true },
            wait: { source: 'variable', variable: 'sensor_1.detected', operator: 'equal', expected: true, timeout: 10 },
            setVar: { variable: 'pick_done', value: true },
            loop: { repeat: 2 },
            call: { functionId: 'place_material' }
        };

        return {
            id: makeId(type),
            type,
            depth: 0,
            ...defaults[type],
            ...overrides
        };
    }

    function createDefaultState() {
        return {
            activeFunctionId: 'main',
            expandedFunctionId: 'main',
            selectedInstructionId: null,
            selectedDevice: {
                id: 'robot-s622-1',
                name: 'Z-Arm S622_1',
                type: 'robot'
            },
            functions: [
                {
                    id: 'main',
                    name: 'main',
                    instructions: [
                        createInstruction('moveJ', { id: 'move-pick', target: 'P0' }),
                        createInstruction('setIO', { id: 'io-grip-on', value: true }),
                        createInstruction('wait', { id: 'wait-sensor' }),
                        createInstruction('loop', { id: 'loop-transfer', repeat: 2 }),
                        createInstruction('moveL', { id: 'move-place', target: 'P1', depth: 1 }),
                        createInstruction('setIO', { id: 'io-grip-off', value: false, depth: 1 }),
                        createInstruction('call', { id: 'call-home', functionId: 'place_material' })
                    ]
                },
                {
                    id: 'place_material',
                    name: '放置物料',
                    instructions: [
                        createInstruction('moveL', { id: 'place-approach', target: 'P2', speed: 30 }),
                        createInstruction('setIO', { id: 'place-release', value: false })
                    ]
                }
            ],
            variables: [
                { id: 'sensor_1.detected', name: 'sensor_1.detected', type: 'Bool', value: false, origin: '光电传感器 · 自动生成', readonly: true },
                { id: 'robot_1.ready', name: 'robot_1.ready', type: 'Bool', value: true, origin: 'Z-Arm S622_1 · 系统状态', readonly: true },
                { id: 'gripper_1.closed', name: 'gripper_1.closed', type: 'Bool', value: false, origin: 'Z-EFG-8S$12 · IO 映射', readonly: true },
                { id: 'conveyor_1.count', name: 'conveyor_1.count', type: 'Int', value: 0, origin: '传送带 · 物料计数', readonly: true },
                { id: 'conveyor_1.speed', name: 'conveyor_1.speed', type: 'Double', value: 0.5, origin: '传送带 · 运行速度', readonly: true },
                { id: 'system_1.mode', name: 'system_1.mode', type: 'String', value: 'auto', origin: '系统 · 运行模式', readonly: true },
                { id: 'pick_done', name: 'pick_done', type: 'Bool', value: false, origin: '用户变量 · 可读写', readonly: false },
                { id: 'tray_index', name: 'tray_index', type: 'Int', value: 1, origin: '用户变量 · 可读写', readonly: false }
            ]
        };
    }

    function normalizeVariable(variable) {
        const type = VARIABLE_TYPES.includes(variable?.type) ? variable.type : 'Bool';
        return {
            id: String(variable?.id || makeId('var')),
            name: String(variable?.name || variable?.id || '未命名变量'),
            type,
            value: variable?.value ?? defaultValueForType(type),
            origin: String(variable?.origin || '用户变量 · 可读写'),
            readonly: Boolean(variable?.readonly)
        };
    }

    function normalizeState(rawState) {
        const fallback = createDefaultState();
        if (!rawState || !Array.isArray(rawState.functions) || !rawState.functions.length) return fallback;

        const state = {
            ...fallback,
            ...rawState,
            selectedDevice: { ...fallback.selectedDevice, ...(rawState.selectedDevice || {}) },
            functions: rawState.functions.filter((item) => item && item.id && Array.isArray(item.instructions)),
            variables: (Array.isArray(rawState.variables) ? rawState.variables : fallback.variables).map(normalizeVariable)
        };

        if (!state.functions.some((item) => item.id === state.activeFunctionId)) {
            state.activeFunctionId = state.functions[0].id;
        }

        if (!state.functions.some((item) => item.id === state.expandedFunctionId)) {
            state.expandedFunctionId = null;
        }

        // 不做默认选中：每次载入都没有选中指令，由用户主动点击
        state.selectedInstructionId = null;

        return state;
    }

    function loadState() {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            return normalizeState(saved ? JSON.parse(saved) : null);
        } catch (error) {
            console.warn('读取 3D 场景程序失败，使用示例程序。', error);
            return createDefaultState();
        }
    }

    function initProgramPanel() {
        const panel = document.querySelector('[data-program-panel]');
        if (!panel || panel.dataset.initialized === 'true') return null;
        panel.dataset.initialized = 'true';

        const elements = {
            panel,
            deviceName: panel.querySelector('[data-program-device-name]'),
            functionList: panel.querySelector('[data-function-list]'),
            createToggle: panel.querySelector('[data-create-function-toggle]'),
            createForm: panel.querySelector('[data-create-function-form]'),
            createCancel: panel.querySelector('[data-create-function-cancel]'),
            functionError: panel.querySelector('[data-function-error]'),
            feedback: panel.querySelector('[data-program-feedback]'),
            runState: panel.querySelector('[data-program-run-state]'),
            runButton: panel.querySelector('[data-program-run]'),
            stopButton: panel.querySelector('[data-program-stop]'),
            menu: document.getElementById('programInstructionMenu'),
            toast: document.querySelector('[data-program-toast]'),
            toastMessage: document.querySelector('[data-program-toast-message]'),
            undo: document.querySelector('[data-program-undo]'),
            programTrigger: document.querySelector('[data-tool="program"]')
        };

        let state = loadState();
        let toastTimer = 0;
        let deletedInstruction = null;
        let draggingInstructionId = null;
        let inspectorHeight = null; // null = 自适应内容高度，用户拖拽后固定为像素值
        const run = {
            status: 'idle',
            queue: [],
            index: 0,
            currentId: null,
            completed: new Set(),
            timer: 0
        };

        function saveState() {
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                elements.feedback.textContent = '程序已保存到当前仿真场景';
            } catch (error) {
                console.warn('保存 3D 场景程序失败。', error);
                elements.feedback.textContent = '程序未能保存，请检查浏览器存储权限';
            }
        }

        function getActiveFunction() {
            return state.functions.find((item) => item.id === state.activeFunctionId) || state.functions[0];
        }

        // 在所有函数中查找指令，返回其所属函数与位置
        function findInstruction(instructionId) {
            for (const fn of state.functions) {
                const index = fn.instructions.findIndex((item) => item.id === instructionId);
                if (index >= 0) return { fn, instruction: fn.instructions[index], index };
            }
            return null;
        }

        function getSelectedInstruction() {
            if (!state.selectedInstructionId) return null;
            return findInstruction(state.selectedInstructionId)?.instruction || null;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');
        }

        function getVariable(variableId) {
            return state.variables.find((item) => item.id === variableId) || null;
        }

        function formatVariableValue(value, type) {
            if (type === 'Bool') return value ? 'True' : 'False';
            return String(value ?? '');
        }

        function instructionSummary(instruction) {
            if (instruction.type === 'moveJ' || instruction.type === 'moveL') {
                return `${instruction.target} · 速度 ${instruction.speed}% · 平滑 ${instruction.smoothing}%`;
            }
            if (instruction.type === 'setIO') {
                return `${instruction.device} · ${instruction.node} = ${instruction.value ? 'True' : 'False'}`;
            }
            if (instruction.type === 'wait') {
                if (instruction.source === 'time') return `等待 ${instruction.timeout} 秒`;
                const variable = getVariable(instruction.variable);
                const operatorLabels = { equal: '=', notEqual: '≠', greater: '>', less: '<' };
                const operator = operatorLabels[instruction.operator] || '=';
                return `${variable ? variable.name : instruction.variable} ${operator} ${formatVariableValue(instruction.expected, variable?.type)}`;
            }
            if (instruction.type === 'setVar') {
                const variable = getVariable(instruction.variable);
                return `${variable ? variable.name : '未选择变量'} = ${formatVariableValue(instruction.value, variable?.type)}`;
            }
            if (instruction.type === 'loop') return `重复 ${instruction.repeat} 次`;
            if (instruction.type === 'call') {
                const targetFunction = state.functions.find((item) => item.id === instruction.functionId);
                return targetFunction ? targetFunction.name : '未选择函数';
            }
            return '';
        }

        function instructionRuntimeState(instruction) {
            if (run.currentId === instruction.id) {
                return instruction.type === 'wait' ? { className: 'is-waiting', label: '等待' } : { className: 'is-running', label: '执行中' };
            }
            if (run.completed.has(instruction.id)) return { className: 'is-complete', label: '完成' };
            return { className: '', label: '' };
        }

        // 渲染单个函数的指令行
        function renderFunctionInstructions(fn) {
            if (!fn.instructions.length) {
                return `
                    <div class="program-instruction-empty">
                        <i class="bi bi-diagram-3" aria-hidden="true"></i>
                        <span>这个函数还没有指令，从下方“添加指令”开始。</span>
                    </div>
                `;
            }
            return `
                <div class="program-instruction-list" role="listbox" aria-label="${escapeHtml(fn.name)} 的指令">
                    ${fn.instructions.map((instruction, index) => {
                        const meta = instructionMeta[instruction.type] || instructionMeta.moveJ;
                        const runtime = instructionRuntimeState(instruction);
                        const isSelected = instruction.id === state.selectedInstructionId;
                        const stateClass = [isSelected ? 'is-selected' : '', runtime.className].filter(Boolean).join(' ');
                        return `
                            <div class="program-instruction-row ${stateClass}" data-instruction-id="${escapeHtml(instruction.id)}" data-depth="${Number(instruction.depth) || 0}" role="option" aria-selected="${isSelected}" tabindex="0" draggable="true">
                                <span class="program-instruction-index">${String(index + 1).padStart(2, '0')}</span>
                                <span class="program-instruction-icon"><i class="bi ${meta.icon}" aria-hidden="true"></i></span>
                                <span class="program-instruction-content">
                                    <strong>${escapeHtml(meta.code)} · ${escapeHtml(meta.label)}</strong>
                                </span>
                                <span class="program-instruction-state ${runtime.label ? 'is-active' : ''}">${runtime.label}</span>
                                <button class="program-instruction-delete" type="button" data-delete-instruction aria-label="删除第 ${index + 1} 条指令" title="删除指令"><i class="bi bi-trash3"></i></button>
                                <span class="program-instruction-handle" title="拖动调整顺序" aria-hidden="true"><i class="bi bi-grip-vertical"></i></span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // 选中指令的属性设置面板：嵌入其所属函数的最底部，体现层级关系
        function renderInspectorSlot(fn) {
            const selected = getSelectedInstruction();
            if (!selected || !fn.instructions.some((item) => item.id === selected.id)) return '';
            const meta = instructionMeta[selected.type] || instructionMeta.moveJ;
            const heightStyle = inspectorHeight ? ` style="height: ${inspectorHeight}px;"` : '';
            return `
                <div class="program-inspector${inspectorHeight ? ' has-custom-height' : ''}" data-inspector${heightStyle}>
                    <div class="program-inspector-header">
                        <span class="program-inspector-title">属性 · ${escapeHtml(meta.code)} · ${escapeHtml(meta.label)}</span>
                        <span class="program-property-kind">${escapeHtml(meta.kind)}</span>
                    </div>
                    <form class="program-property-form" data-property-form>${renderPropertyFields(selected)}</form>
                    <div class="program-inspector-grip" data-program-grip title="拖动调整属性区高度" role="separator" aria-orientation="horizontal"></div>
                </div>
            `;
        }

        // 函数手风琴：展开一个会收起其他，再次点击已展开的函数则全部收起
        function renderFunctions() {
            elements.functionList.innerHTML = state.functions.map((fn) => {
                const isExpanded = fn.id === state.expandedFunctionId;
                return `
                    <section class="program-function${isExpanded ? ' is-expanded' : ''}" data-function-id="${escapeHtml(fn.id)}">
                        <div class="program-function-header" data-function-toggle role="button" tabindex="0" aria-expanded="${isExpanded}">
                            <i class="bi bi-caret-down-fill program-function-chevron" aria-hidden="true"></i>
                            <span class="program-function-name">${escapeHtml(fn.name)}</span>
                            <button class="program-function-rename" type="button" data-rename-function title="重命名函数" aria-label="重命名函数 ${escapeHtml(fn.name)}"><i class="bi bi-pencil" aria-hidden="true"></i></button>
                            <span class="program-function-count">${fn.instructions.length} 条指令</span>
                        </div>
                        <div class="program-function-body" ${isExpanded ? '' : 'hidden'}>
                            ${renderFunctionInstructions(fn)}
                            <button class="panel-secondary-btn program-btn program-instruction-add" type="button" data-add-instruction-toggle>
                                <i class="bi bi-plus-lg" aria-hidden="true"></i>
                                添加指令
                            </button>
                            ${renderInspectorSlot(fn)}
                        </div>
                    </section>
                `;
            }).join('');
        }

        // 运行过程中的轻量更新：只刷新指令行的选中/执行状态，不重建属性表单
        function renderInstructionStates() {
            elements.functionList.querySelectorAll('.program-instruction-row').forEach((row) => {
                const found = findInstruction(row.dataset.instructionId);
                if (!found) return;
                const runtime = instructionRuntimeState(found.instruction);
                const isSelected = found.instruction.id === state.selectedInstructionId;
                row.className = `program-instruction-row ${[isSelected ? 'is-selected' : '', runtime.className].filter(Boolean).join(' ')}`;
                row.setAttribute('aria-selected', String(isSelected));
                const stateEl = row.querySelector('.program-instruction-state');
                stateEl.textContent = runtime.label;
                stateEl.classList.toggle('is-active', Boolean(runtime.label));
            });
        }

        function option(value, label, current) {
            return `<option value="${escapeHtml(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
        }

        function renderMotionProperties(instruction) {
            return `
                <label class="program-property-field is-wide">
                    <span>目标点</span>
                    <span class="program-property-inline">
                        <select data-property-field="target">
                            ${['P0', 'P1', 'P2', 'Home'].map((item) => option(item, item, instruction.target)).join('')}
                        </select>
                        <button class="panel-secondary-btn program-btn" type="button" data-move-here>运动到此</button>
                    </span>
                </label>
                <div class="program-property-triple">
                    <label class="program-property-field">
                        <span>速度 (%)</span>
                        <input type="number" min="1" max="100" step="1" value="${Number(instruction.speed)}" data-property-field="speed">
                    </label>
                    <label class="program-property-field">
                        <span>加速度 (%)</span>
                        <input type="number" min="1" max="100" step="1" value="${Number(instruction.acceleration)}" data-property-field="acceleration">
                    </label>
                    <label class="program-property-field">
                        <span>平滑度 (%)</span>
                        <input type="number" min="0" max="100" step="1" value="${Number(instruction.smoothing)}" data-property-field="smoothing">
                    </label>
                </div>
                <p class="program-property-help">“运动到此”仅移动仿真模型，用于确认目标点位置，不会启动整段程序。</p>
            `;
        }

        function renderIOProperties(instruction) {
            return `
                <label class="program-property-field">
                    <span class="program-device-signal"><i class="bi bi-circle-fill" aria-hidden="true"></i>设备选择</span>
                    <select data-property-field="device">
                        ${option('Z-EFG-8S$12', 'Z-EFG-8S$12', instruction.device)}
                        ${option('Conveyor_IO_1', 'Conveyor_IO_1', instruction.device)}
                        ${option('Cylinder_IO_1', 'Cylinder_IO_1', instruction.device)}
                    </select>
                </label>
                <label class="program-property-field">
                    <span>节点选择</span>
                    <select data-property-field="node">
                        ${option('旋转节点', '旋转节点', instruction.node)}
                        ${option('夹爪使能', '夹爪使能', instruction.node)}
                        ${option('复位节点', '复位节点', instruction.node)}
                    </select>
                </label>
                <label class="program-property-field">
                    <span>参数类型</span>
                    <select data-property-field="parameterType">
                        ${option('Bool', 'Bool', instruction.parameterType)}
                        ${option('Int', 'Int', instruction.parameterType)}
                    </select>
                </label>
                <label class="program-property-field">
                    <span>参数值</span>
                    <select data-property-field="value" data-value-type="boolean">
                        ${option('true', 'True', instruction.value)}
                        ${option('false', 'False', instruction.value)}
                    </select>
                </label>
                <p class="program-property-help">设备在线。运行到此指令时，将把所选节点写入指定参数值。</p>
            `;
        }

        function renderValueEditor(field, value, type) {
            if (type === 'Int' || type === 'Double') {
                const step = type === 'Int' ? '1' : '0.1';
                return `<input type="number" step="${step}" value="${Number(value) || 0}" data-property-field="${field}" data-value-type="number">`;
            }
            if (type === 'String') {
                return `<input type="text" value="${escapeHtml(value ?? '')}" data-property-field="${field}">`;
            }
            return `
                <select data-property-field="${field}" data-value-type="boolean">
                    ${option('true', 'True', value)}
                    ${option('false', 'False', value)}
                </select>
            `;
        }

        function renderWaitProperties(instruction) {
            const variable = getVariable(instruction.variable);
            const variableType = variable?.type || 'Bool';
            const isNumeric = variableType === 'Int' || variableType === 'Double';
            return `
                <label class="program-property-field">
                    <span>等待类型</span>
                    <select data-property-field="source">
                        ${option('variable', '全局变量', instruction.source)}
                        ${option('time', '固定时间', instruction.source)}
                    </select>
                </label>
                <label class="program-property-field">
                    <span>最长等待 (秒)</span>
                    <input type="number" min="0" max="3600" step="1" value="${Number(instruction.timeout)}" data-property-field="timeout">
                </label>
                ${instruction.source === 'variable' ? `
                    <label class="program-property-field is-wide">
                        <span>全局变量</span>
                        <select data-property-field="variable">
                            ${state.variables.map((item) => option(item.id, `${item.name} (${item.type})`, instruction.variable)).join('')}
                        </select>
                    </label>
                    <label class="program-property-field">
                        <span>判断条件</span>
                        <select data-property-field="operator">
                            ${option('equal', '等于', instruction.operator)}
                            ${variableType !== 'Bool' ? option('notEqual', '不等于', instruction.operator) : ''}
                            ${isNumeric ? option('greater', '大于', instruction.operator) + option('less', '小于', instruction.operator) : ''}
                        </select>
                    </label>
                    <label class="program-property-field">
                        <span>期望值</span>
                        ${renderValueEditor('expected', instruction.expected, variableType)}
                    </label>
                ` : '<p class="program-property-help">程序将在指定时间后继续执行下一条指令。</p>'}
            `;
        }

        function renderSetVarProperties(instruction) {
            const writable = state.variables.filter((item) => !item.readonly);
            const variable = getVariable(instruction.variable) || writable[0] || null;
            if (!variable) {
                return '<p class="program-property-help">还没有可写的用户变量。请先在左侧「变量」面板中新建变量。</p>';
            }
            return `
                <label class="program-property-field is-wide">
                    <span>目标变量（仅用户变量可写）</span>
                    <select data-property-field="variable">
                        ${writable.map((item) => option(item.id, `${item.name} (${item.type})`, variable.id)).join('')}
                    </select>
                </label>
                <label class="program-property-field">
                    <span>写入值</span>
                    ${renderValueEditor('value', instruction.value, variable.type)}
                </label>
                <p class="program-property-help">运行到此指令时写入变量；其他设备的「等待条件」监听到变化后会被触发，用于设备间协同。</p>
            `;
        }

        function renderLoopProperties(instruction) {
            return `
                <label class="program-property-field">
                    <span>循环次数</span>
                    <input type="number" min="1" max="999" step="1" value="${Number(instruction.repeat)}" data-property-field="repeat">
                </label>
                <p class="program-property-help">缩进显示的后续指令属于该循环。首版支持一级嵌套，用于验证信息密度与执行状态。</p>
            `;
        }

        function renderCallProperties(instruction) {
            const owner = findInstruction(instruction.id)?.fn;
            return `
                <label class="program-property-field is-wide">
                    <span>调用函数</span>
                    <select data-property-field="functionId">
                        ${state.functions.filter((item) => item.id !== owner?.id).map((item) => option(item.id, item.name, instruction.functionId)).join('')}
                    </select>
                </label>
                <p class="program-property-help">运行到此处时进入所选函数；函数完成后返回并继续下一条指令。</p>
            `;
        }

        // 属性表单字段（嵌入函数底部的属性面板中）
        function renderPropertyFields(instruction) {
            if (instruction.type === 'moveJ' || instruction.type === 'moveL') {
                return renderMotionProperties(instruction);
            }
            if (instruction.type === 'setIO') {
                return renderIOProperties(instruction);
            }
            if (instruction.type === 'wait') {
                return renderWaitProperties(instruction);
            }
            if (instruction.type === 'setVar') {
                return renderSetVarProperties(instruction);
            }
            if (instruction.type === 'loop') {
                return renderLoopProperties(instruction);
            }
            if (instruction.type === 'call') {
                return renderCallProperties(instruction);
            }
            return '';
        }

        function renderProgram() {
            elements.deviceName.textContent = state.selectedDevice.name;
            renderFunctions();
            syncRunControls();
        }

        function getProgramTab() {
            return document.querySelector('.panel-tab[data-tab="program"]');
        }

        function isOpen() {
            return Boolean(getProgramTab()?.classList.contains('active'));
        }

        function syncTriggerState() {
            elements.programTrigger?.classList.toggle('active', isOpen());
            elements.programTrigger?.setAttribute('aria-expanded', String(isOpen()));
        }

        function open() {
            renderProgram();
            const tab = getProgramTab();
            if (tab && !tab.classList.contains('active')) {
                // 复用右侧面板统一的 tab 切换逻辑（script.js 中绑定）
                tab.click();
            }
            syncTriggerState();
        }

        function close() {
            const tab = getProgramTab();
            if (tab?.classList.contains('active')) tab.click();
            elements.menu?.hidePopover?.();
            syncTriggerState();
        }

        function toggle() {
            if (isOpen()) {
                close();
                return false;
            }
            open();
            return true;
        }

        function showToast(message, options = {}) {
            window.clearTimeout(toastTimer);
            elements.toastMessage.textContent = message;
            elements.undo.hidden = !options.undo;
            elements.toast.hidden = false;
            toastTimer = window.setTimeout(() => {
                elements.toast.hidden = true;
                deletedInstruction = null;
            }, options.duration || 3600);
        }

        function selectInstruction(instructionId) {
            state.selectedInstructionId = instructionId;
            renderFunctions();
            saveState();
        }

        function addInstruction(type) {
            const activeFunction = getActiveFunction();
            const instruction = createInstruction(type);
            if (type === 'call') {
                instruction.functionId = state.functions.find((item) => item.id !== activeFunction.id)?.id || '';
            }
            if (type === 'setVar') {
                instruction.variable = state.variables.find((item) => !item.readonly)?.id || '';
            }
            activeFunction.instructions.push(instruction);
            state.selectedInstructionId = instruction.id;
            saveState();
            renderProgram();
            elements.menu?.hidePopover?.();
            showToast(`已添加“${instructionMeta[type].label}”指令`);
            window.requestAnimationFrame(() => {
                elements.functionList.querySelector(`[data-instruction-id="${CSS.escape(instruction.id)}"]`)?.scrollIntoView({ block: 'nearest' });
            });
        }

        function deleteInstruction(instructionId) {
            const found = findInstruction(instructionId);
            if (!found) return;
            found.fn.instructions.splice(found.index, 1);
            deletedInstruction = { functionId: found.fn.id, instruction: found.instruction, index: found.index };
            // 删除后不自动选中其他指令
            if (state.selectedInstructionId === instructionId) state.selectedInstructionId = null;
            saveState();
            renderProgram();
            showToast(`已删除“${instructionMeta[found.instruction.type].label}”指令`, { undo: true, duration: 5000 });
        }

        function undoDelete() {
            if (!deletedInstruction) return;
            const targetFunction = state.functions.find((item) => item.id === deletedInstruction.functionId);
            if (!targetFunction) return;
            targetFunction.instructions.splice(deletedInstruction.index, 0, deletedInstruction.instruction);
            state.activeFunctionId = targetFunction.id;
            state.expandedFunctionId = targetFunction.id;
            state.selectedInstructionId = deletedInstruction.instruction.id;
            deletedInstruction = null;
            elements.toast.hidden = true;
            saveState();
            renderProgram();
        }

        function updateInstructionField(field, rawValue, valueType) {
            const instruction = getSelectedInstruction();
            if (!instruction || !field) return;
            let value = rawValue;
            if (valueType === 'boolean') value = rawValue === 'true';
            else if (valueType === 'number') value = Number(rawValue);
            else if (['speed', 'acceleration', 'smoothing', 'timeout', 'repeat'].includes(field)) value = Number(rawValue);
            instruction[field] = value;
            saveState();
            // 切换等待来源/目标变量后，期望值与写入值编辑器需要按变量类型重渲染
            if (field === 'source' || field === 'variable') renderFunctions();
            else renderInstructionStates();
        }

        function moveInstruction(draggedId, targetId, insertBefore = true) {
            if (!draggedId || !targetId || draggedId === targetId) return;
            const target = findInstruction(targetId);
            if (!target) return;
            const instructions = target.fn.instructions;
            const fromIndex = instructions.findIndex((item) => item.id === draggedId);
            if (fromIndex < 0) return;
            const [instruction] = instructions.splice(fromIndex, 1);
            let toIndex = instructions.findIndex((item) => item.id === targetId);
            if (!insertBefore) toIndex += 1;
            instructions.splice(toIndex, 0, instruction);
            saveState();
            renderFunctions();
            showToast('已调整指令顺序');
        }

        function syncRunControls() {
            const labels = {
                idle: '未运行',
                running: '运行中',
                paused: '已暂停',
                waiting: '等待中'
            };
            elements.runState.textContent = labels[run.status] || labels.idle;
            elements.runState.classList.toggle('is-running', run.status === 'running');
            elements.runState.classList.toggle('is-paused', run.status === 'paused');
            elements.runState.classList.toggle('is-waiting', run.status === 'waiting');
            elements.stopButton.disabled = run.status === 'idle';
            elements.runButton.classList.toggle('is-running', run.status === 'running' || run.status === 'waiting');
            elements.runButton.innerHTML = run.status === 'running' || run.status === 'waiting'
                ? '<i class="bi bi-pause-fill" aria-hidden="true"></i>暂停程序'
                : run.status === 'paused'
                    ? '<i class="bi bi-play-fill" aria-hidden="true"></i>继续运行'
                    : '<i class="bi bi-play-fill" aria-hidden="true"></i>运行程序';
        }

        function emitRunState() {
            window.dispatchEvent(new CustomEvent('hitbot:scene-program-run-state', {
                detail: {
                    status: run.status,
                    currentInstructionId: run.currentId,
                    functionId: state.activeFunctionId
                }
            }));
        }

        function completeRun() {
            window.clearTimeout(run.timer);
            run.status = 'idle';
            run.currentId = null;
            elements.feedback.textContent = `仿真完成 · ${run.queue.length} 条指令已执行`;
            syncRunControls();
            renderInstructionStates();
            emitRunState();
            showToast('场景程序仿真完成');
        }

        function scheduleCurrentInstruction() {
            if (run.status !== 'running' && run.status !== 'waiting') return;
            if (run.index >= run.queue.length) {
                completeRun();
                return;
            }

            const instruction = run.queue[run.index];
            run.currentId = instruction.id;
            run.status = instruction.type === 'wait' ? 'waiting' : 'running';
            elements.feedback.textContent = instruction.type === 'wait'
                ? `等待 ${instructionSummary(instruction)}`
                : `正在执行 ${instructionMeta[instruction.type].code} · 第 ${run.index + 1} 步`;
            syncRunControls();
            renderInstructionStates();
            emitRunState();

            run.timer = window.setTimeout(() => {
                run.completed.add(instruction.id);
                run.index += 1;
                run.status = 'running';
                scheduleCurrentInstruction();
            }, instruction.type === 'wait' ? WAIT_STEP_DURATION : RUN_STEP_DURATION);
        }

        function startRun() {
            if (run.status === 'paused') {
                run.status = 'running';
                scheduleCurrentInstruction();
                return;
            }
            if (run.status === 'running' || run.status === 'waiting') {
                window.clearTimeout(run.timer);
                run.status = 'paused';
                elements.feedback.textContent = `已暂停在第 ${run.index + 1} 条指令`;
                syncRunControls();
                renderInstructionStates();
                emitRunState();
                return;
            }

            state.activeFunctionId = 'main';
            state.expandedFunctionId = 'main';
            run.queue = [...(state.functions.find((item) => item.id === 'main')?.instructions || [])];
            if (!run.queue.length) {
                showToast('main 函数中没有可运行的指令');
                return;
            }
            run.index = 0;
            run.currentId = null;
            run.completed.clear();
            run.status = 'running';
            renderProgram();
            scheduleCurrentInstruction();
        }

        function stopRun() {
            window.clearTimeout(run.timer);
            run.status = 'idle';
            run.index = 0;
            run.currentId = null;
            run.completed.clear();
            elements.feedback.textContent = '程序已停止，仿真状态保持在当前位置';
            syncRunControls();
            renderInstructionStates();
            emitRunState();
        }

        elements.createToggle.addEventListener('click', () => {
            elements.createForm.hidden = !elements.createForm.hidden;
            elements.functionError.textContent = '';
            if (!elements.createForm.hidden) elements.createForm.elements.functionName.focus();
        });

        elements.createCancel.addEventListener('click', () => {
            elements.createForm.hidden = true;
            elements.createForm.reset();
            elements.functionError.textContent = '';
        });

        elements.createForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const name = String(new FormData(elements.createForm).get('functionName') || '').trim();
            if (!name) {
                elements.functionError.textContent = '请输入函数名称，例如“放置物料”。';
                return;
            }
            if (state.functions.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
                elements.functionError.textContent = `“${name}”已经存在，请使用其他名称。`;
                return;
            }
            const nextFunction = { id: makeId('function'), name, instructions: [] };
            state.functions.push(nextFunction);
            state.activeFunctionId = nextFunction.id;
            state.expandedFunctionId = nextFunction.id;
            state.selectedInstructionId = null;
            elements.createForm.hidden = true;
            elements.createForm.reset();
            saveState();
            renderProgram();
            showToast(`已创建函数“${name}”`);
        });

        elements.menu?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-add-instruction]');
            if (button) addInstruction(button.dataset.addInstruction);
        });

        // 函数手风琴：展开一个收起其他；点击已展开的函数则全部收起
        function toggleFunction(functionId) {
            state.expandedFunctionId = state.expandedFunctionId === functionId ? null : functionId;
            if (state.expandedFunctionId) state.activeFunctionId = functionId;
            saveState();
            renderFunctions();
        }

        // 函数重命名：行内编辑，规则同新建函数（非空、不重名）
        function startFunctionRename(header, fn) {
            const nameSlot = header.querySelector('.program-function-name');
            if (!nameSlot) return;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = fn.name;
            input.maxLength = 24;
            input.className = 'program-function-rename-input';
            input.setAttribute('aria-label', '函数名称');
            nameSlot.replaceWith(input);
            input.focus();
            input.select();
            let committed = false;
            const commit = () => {
                if (committed) return;
                committed = true;
                const name = input.value.trim();
                if (!name) {
                    showToast('函数名称不能为空。');
                    renderFunctions();
                    return;
                }
                if (state.functions.some((item) => item.id !== fn.id && item.name.toLowerCase() === name.toLowerCase())) {
                    showToast(`“${name}”已经存在，请使用其他名称。`);
                    renderFunctions();
                    return;
                }
                if (name !== fn.name) {
                    fn.name = name;
                    saveState();
                    showToast(`已重命名为“${name}”`);
                }
                renderFunctions();
            };
            input.addEventListener('keydown', (event) => {
                event.stopPropagation();
                if (event.key === 'Enter') commit();
                if (event.key === 'Escape') {
                    committed = true;
                    renderFunctions();
                }
            });
            input.addEventListener('click', (event) => event.stopPropagation());
            input.addEventListener('blur', commit);
        }

        // 打开添加指令菜单：锚定到对应函数的按钮，并标记目标函数
        function openInstructionMenu(addButton, functionId) {
            state.activeFunctionId = functionId;
            const fn = state.functions.find((item) => item.id === functionId);
            const heading = elements.menu?.querySelector('.program-instruction-menu-heading');
            if (heading && fn) heading.textContent = `添加到「${fn.name}」末尾`;
            elements.functionList.querySelectorAll('[data-add-instruction-toggle]').forEach((button) => {
                button.style.anchorName = '';
            });
            addButton.style.anchorName = '--program-instruction-trigger';
            if (elements.menu?.matches(':popover-open')) elements.menu.hidePopover();
            else elements.menu?.showPopover?.();
        }

        // 函数列表区域内的点击：函数开合 / 重命名 / 添加指令 / 选中 / 删除
        elements.functionList.addEventListener('click', (event) => {
            const renameToggle = event.target.closest('[data-rename-function]');
            if (renameToggle) {
                const section = renameToggle.closest('[data-function-id]');
                const fn = state.functions.find((item) => item.id === section.dataset.functionId);
                if (fn) startFunctionRename(section.querySelector('[data-function-toggle]'), fn);
                return;
            }

            const functionToggle = event.target.closest('[data-function-toggle]');
            if (functionToggle) {
                toggleFunction(functionToggle.closest('[data-function-id]').dataset.functionId);
                return;
            }

            const addToggle = event.target.closest('[data-add-instruction-toggle]');
            if (addToggle) {
                openInstructionMenu(addToggle, addToggle.closest('[data-function-id]').dataset.functionId);
                return;
            }

            const row = event.target.closest('[data-instruction-id]');
            if (!row) return;
            if (event.target.closest('[data-delete-instruction]')) {
                deleteInstruction(row.dataset.instructionId);
                return;
            }
            selectInstruction(row.dataset.instructionId);
        });

        elements.functionList.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            if (event.target.closest('input, select, textarea')) return;
            // 函数头是可聚焦的 role=button，支持键盘开合
            const functionToggle = event.target.closest('[data-function-toggle]');
            if (functionToggle && !event.target.closest('button')) {
                event.preventDefault();
                toggleFunction(functionToggle.closest('[data-function-id]').dataset.functionId);
                return;
            }
            const row = event.target.closest('[data-instruction-id]');
            if (!row || event.target.closest('button')) return;
            event.preventDefault();
            selectInstruction(row.dataset.instructionId);
        });

        elements.functionList.addEventListener('dragstart', (event) => {
            const row = event.target.closest('[data-instruction-id]');
            if (!row) return;
            draggingInstructionId = row.dataset.instructionId;
            row.classList.add('is-dragging');
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', draggingInstructionId);
        });

        // 清除插位线提示
        function clearDropIndicator() {
            elements.functionList.querySelectorAll('.is-drop-before, .is-drop-after').forEach((item) => {
                item.classList.remove('is-drop-before', 'is-drop-after');
            });
        }

        // 根据鼠标在目标行的上半/下半，决定插到该行之前还是之后
        function dropPosition(row, clientY) {
            const rect = row.getBoundingClientRect();
            return clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        }

        elements.functionList.addEventListener('dragover', (event) => {
            const row = event.target.closest('[data-instruction-id]');
            clearDropIndicator();
            if (!row || row.dataset.instructionId === draggingInstructionId) return;
            event.preventDefault();
            row.classList.add(dropPosition(row, event.clientY) === 'before' ? 'is-drop-before' : 'is-drop-after');
        });

        elements.functionList.addEventListener('dragleave', (event) => {
            // 拖出整个函数列表区域时清除插位线
            if (event.relatedTarget instanceof Node && elements.functionList.contains(event.relatedTarget)) return;
            clearDropIndicator();
        });

        elements.functionList.addEventListener('drop', (event) => {
            const row = event.target.closest('[data-instruction-id]');
            if (!row) return;
            event.preventDefault();
            const before = dropPosition(row, event.clientY) === 'before';
            clearDropIndicator();
            moveInstruction(draggingInstructionId || event.dataTransfer.getData('text/plain'), row.dataset.instructionId, before);
        });

        elements.functionList.addEventListener('dragend', () => {
            draggingInstructionId = null;
            clearDropIndicator();
            elements.functionList.querySelectorAll('.is-dragging').forEach((item) => item.classList.remove('is-dragging'));
        });

        // 属性面板嵌入函数体内，表单事件通过容器委托
        elements.functionList.addEventListener('change', (event) => {
            const field = event.target.closest('[data-property-field]');
            if (!field) return;
            updateInstructionField(field.dataset.propertyField, field.value, field.dataset.valueType);
        });

        elements.functionList.addEventListener('click', (event) => {
            if (!event.target.closest('[data-move-here]')) return;
            const instruction = getSelectedInstruction();
            if (!instruction) return;
            elements.feedback.textContent = `仿真机械臂已移动到 ${instruction.target}`;
            showToast(`已在仿真中定位到目标点 ${instruction.target}`);
        });

        // 属性面板高度：默认自适应内容，摁住底边边缘拖拽可固定为像素高度（同右侧面板左缘调宽的交互）
        elements.functionList.addEventListener('pointerdown', (event) => {
            const grip = event.target.closest('[data-program-grip]');
            if (!grip) return;
            event.preventDefault();
            const inspector = grip.closest('[data-inspector]');
            if (!inspector) return;
            const startY = event.clientY;
            const startHeight = inspector.offsetHeight;
            grip.classList.add('is-resizing');
            document.body.classList.add('program-inspector-resizing');
            grip.setPointerCapture(event.pointerId);

            const onMove = (moveEvent) => {
                inspectorHeight = Math.round(Math.min(480, Math.max(120, startHeight + (moveEvent.clientY - startY))));
                inspector.classList.add('has-custom-height');
                inspector.style.height = `${inspectorHeight}px`;
            };
            const onEnd = () => {
                grip.classList.remove('is-resizing');
                document.body.classList.remove('program-inspector-resizing');
                grip.removeEventListener('pointermove', onMove);
                grip.removeEventListener('pointerup', onEnd);
                grip.removeEventListener('pointercancel', onEnd);
            };
            grip.addEventListener('pointermove', onMove);
            grip.addEventListener('pointerup', onEnd);
            grip.addEventListener('pointercancel', onEnd);
        });

        elements.runButton.addEventListener('click', startRun);
        elements.stopButton.addEventListener('click', stopRun);
        elements.undo.addEventListener('click', undoDelete);

        // 切换到其他面板 tab 时，同步左侧工具栏按钮的激活状态
        document.querySelectorAll('.panel-tab[data-tab]').forEach((tab) => {
            tab.addEventListener('click', () => window.requestAnimationFrame(syncTriggerState));
        });

        window.addEventListener('hitbot:scene-selection-changed', (event) => {
            const detail = event.detail || {};
            const programmableTypes = ['robot', 'gripper', 'zmod', 'device'];
            if (!programmableTypes.includes(detail.objectType)) {
                elements.feedback.textContent = detail.displayName
                    ? `${detail.displayName} 不包含设备程序，仍显示 ${state.selectedDevice.name}`
                    : '选择场景中的机器人以查看设备程序';
                return;
            }
            state.selectedDevice = {
                id: detail.id || state.selectedDevice.id,
                name: detail.displayName || detail.modelName || state.selectedDevice.name,
                type: detail.objectType
            };
            saveState();
            renderProgram();
            if (!isOpen()) open();
        });

        window.addEventListener('hitbot:execute-toolbar-change', (event) => {
            const detail = event.detail || {};
            if (detail.dataSource !== 'scene-program') return;
            if (detail.runState === 'running' && run.status !== 'running' && run.status !== 'waiting') startRun();
            else if (detail.runState === 'paused' && (run.status === 'running' || run.status === 'waiting')) startRun();
            else if (detail.runState === 'idle' && run.status !== 'idle') stopRun();
        });

        // 变量变更广播：左侧变量面板与指令属性表单共用同一份数据
        function emitVariablesChanged() {
            window.dispatchEvent(new CustomEvent('hitbot:scene-variables-changed'));
        }

        window.addEventListener('hitbot:scene-variables-changed', () => {
            renderFunctions();
        });

        function countVariableReferences(variableId) {
            return state.functions.reduce((total, fn) => total + fn.instructions.filter((instruction) => instruction.variable === variableId).length, 0);
        }

        const variablesApi = {
            list: () => state.variables.map((item) => ({ ...item })),
            get: (variableId) => {
                const variable = getVariable(variableId);
                return variable ? { ...variable } : null;
            },
            setValue(variableId, value) {
                const variable = getVariable(variableId);
                if (!variable) return { ok: false, message: '变量不存在' };
                variable.value = value;
                saveState();
                emitVariablesChanged();
                return { ok: true };
            },
            add({ name, type, value }) {
                const trimmedName = String(name || '').trim();
                if (!trimmedName) return { ok: false, message: '请输入变量名称，例如 pick_done。' };
                if (!VARIABLE_TYPES.includes(type)) return { ok: false, message: '请选择变量类型。' };
                if (state.variables.some((item) => item.name.toLowerCase() === trimmedName.toLowerCase())) {
                    return { ok: false, message: `“${trimmedName}”已经存在，请使用其他名称。` };
                }
                const variable = {
                    id: makeId('var'),
                    name: trimmedName,
                    type,
                    value: value ?? defaultValueForType(type),
                    origin: '用户变量 · 可读写',
                    readonly: false
                };
                state.variables.push(variable);
                saveState();
                emitVariablesChanged();
                showToast(`已创建全局变量 ${variable.name}`);
                return { ok: true, variable: { ...variable } };
            },
            rename(variableId, name) {
                const variable = getVariable(variableId);
                if (!variable) return { ok: false, message: '变量不存在' };
                const trimmedName = String(name || '').trim();
                if (!trimmedName) return { ok: false, message: '变量名称不能为空。' };
                if (state.variables.some((item) => item.id !== variableId && item.name.toLowerCase() === trimmedName.toLowerCase())) {
                    return { ok: false, message: `“${trimmedName}”已经存在，请使用其他名称。` };
                }
                variable.name = trimmedName;
                saveState();
                emitVariablesChanged();
                return { ok: true };
            },
            update(variableId, { name, type, value }) {
                const variable = getVariable(variableId);
                if (!variable) return { ok: false, message: '变量不存在' };
                if (variable.readonly) return { ok: false, message: '系统变量由设备自动创建，不能编辑。' };
                const trimmedName = String(name || '').trim();
                if (!trimmedName) return { ok: false, message: '变量名称不能为空。' };
                if (!VARIABLE_TYPES.includes(type)) return { ok: false, message: '请选择变量类型。' };
                if (state.variables.some((item) => item.id !== variableId && item.name.toLowerCase() === trimmedName.toLowerCase())) {
                    return { ok: false, message: `“${trimmedName}”已经存在，请使用其他名称。` };
                }
                variable.name = trimmedName;
                variable.type = type;
                variable.value = value ?? defaultValueForType(type);
                saveState();
                emitVariablesChanged();
                return { ok: true };
            },
            remove(variableId) {
                const variable = getVariable(variableId);
                if (!variable) return { ok: false, message: '变量不存在' };
                if (variable.readonly) return { ok: false, message: '系统变量由设备自动创建，不能删除。' };
                const references = countVariableReferences(variableId);
                if (references > 0) return { ok: false, message: `“${variable.name}”正被 ${references} 条指令引用，请先删除相关指令。` };
                state.variables = state.variables.filter((item) => item.id !== variableId);
                saveState();
                emitVariablesChanged();
                showToast(`已删除变量 ${variable.name}`);
                return { ok: true };
            }
        };

        renderProgram();
        syncTriggerState();

        const api = {
            open,
            close,
            toggle,
            isOpen,
            run: startRun,
            stop: stopRun,
            toast: showToast,
            variables: variablesApi
        };
        window.HitbotProgramPanel = api;
        window.dispatchEvent(new CustomEvent('hitbot:program-panel-ready'));
        return api;
    }

    window.initProgramPanel = initProgramPanel;
    document.addEventListener('DOMContentLoaded', () => {
        if (initProgramPanel()) return;
        // 面板内容异步插入（或旧缓存的 panel-loader 未回调）时，监听 DOM 兜底初始化
        const observer = new MutationObserver(() => {
            if (initProgramPanel()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();
