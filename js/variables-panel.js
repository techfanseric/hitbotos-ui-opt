// 全局变量面板（左侧浮层）
// 数据统一由 js/program-panel.js 的 HitbotProgramPanel.variables API 管理，
// 本模块只负责展示与交互，通过 'hitbot:scene-variables-changed' 事件保持同步。
(function () {
    const VARIABLE_TYPES = ['Bool', 'Int', 'Double', 'String'];
    const PANEL_WIDTH = 320;
    const PANEL_TIP = '传感器与设备状态会自动生成只读变量；用户变量可被「设置变量」指令写入，用于设备间协同。仿真期间可手动改值验证程序逻辑。';

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function getVariablesApi() {
        return window.HitbotProgramPanel?.variables || null;
    }

    function showToast(message) {
        window.HitbotProgramPanel?.toast?.(message);
    }

    function infoTipHTML(text, label) {
        return `
            <span class="variable-info" tabindex="0" role="note" aria-label="${escapeHtml(label)}">
                <i class="bi bi-info-circle" aria-hidden="true"></i>
                <span class="variable-info-tip">${escapeHtml(text)}</span>
            </span>
        `;
    }

    function createPanel() {
        const panelHTML = `
            <div class="variables-panel initial-position hidden" id="variablesPanel" aria-label="全局变量面板">
                <div class="panel-header">
                    <div class="panel-title">
                        <i class="bi bi-braces"></i>
                        <span>全局变量</span>
                        ${infoTipHTML(PANEL_TIP, '什么是全局变量')}
                    </div>
                    <div class="panel-controls">
                        <button class="panel-close-btn" type="button" title="关闭">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
                <div class="variables-panel-body">
                    <form class="variables-create-form" data-create-form hidden>
                        <div class="variables-create-row">
                            <input type="text" name="variableName" maxlength="24" autocomplete="off" placeholder="变量名称，例如 pick_done" aria-label="变量名称">
                            <select name="variableType" aria-label="变量类型">
                                ${VARIABLE_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('')}
                            </select>
                        </div>
                        <div class="variables-create-row">
                            <span class="variables-create-value" data-create-value></span>
                        </div>
                        <div class="variables-create-actions">
                            <button class="panel-secondary-btn" type="button" data-create-cancel>取消</button>
                            <button class="panel-primary-btn" type="submit">创建变量</button>
                        </div>
                        <p class="variables-create-error" data-create-error role="alert"></p>
                    </form>
                    <div class="variables-list" data-variables-list></div>
                </div>
                <div class="variables-panel-footer">
                    <button class="panel-secondary-btn variables-add-btn" type="button" data-create-toggle>
                        <i class="bi bi-plus-lg" aria-hidden="true"></i>
                        <span>新建变量</span>
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', panelHTML);
        return document.getElementById('variablesPanel');
    }

    function initVariablesPanel() {
        if (window.HitbotVariablesPanel) return window.HitbotVariablesPanel;

        const panel = createPanel();
        const elements = {
            panel,
            header: panel.querySelector('.panel-header'),
            close: panel.querySelector('.panel-close-btn'),
            list: panel.querySelector('[data-variables-list]'),
            createToggle: panel.querySelector('[data-create-toggle]'),
            createForm: panel.querySelector('[data-create-form]'),
            createValue: panel.querySelector('[data-create-value]'),
            createError: panel.querySelector('[data-create-error]')
        };

        let visible = false;
        let isDragging = false;
        let userDragged = false;
        const dragOffset = { x: 0, y: 0 };

        // 锚定到 3D 仿真窗口内的左侧工具栏右侧，并约束在仿真窗口范围内
        function anchorToToolbar() {
            const leftToolbar = document.querySelector('.left-toolbar');
            if (!leftToolbar) return;
            const toolbarRect = leftToolbar.getBoundingClientRect();
            const simWindow = document.querySelector('.simulation-window');
            const simRect = simWindow ? simWindow.getBoundingClientRect() : null;
            const gap = 12;
            const panelWidth = panel.offsetWidth || PANEL_WIDTH;

            let left = toolbarRect.right + gap;
            let top = toolbarRect.top;
            let bottomLimit = window.innerHeight;
            const statusBar = document.querySelector('.status-bar');
            if (statusBar) bottomLimit = statusBar.getBoundingClientRect().top;

            if (simRect) {
                left = Math.max(simRect.left + 8, Math.min(left, simRect.right - panelWidth - 8));
                top = Math.max(simRect.top + 8, top);
                bottomLimit = Math.min(bottomLimit, simRect.bottom - 8);
            }

            panel.style.maxHeight = `${Math.max(160, bottomLimit - top)}px`;
            panel.style.left = `${left}px`;
            panel.style.top = `${top}px`;
            panel.style.transform = 'none';
        }

        function setInitialPosition() {
            window.setTimeout(() => {
                panel.classList.remove('initial-position');
                anchorToToolbar();
            }, 100);
        }

        function defaultValueForType(type) {
            if (type === 'Int' || type === 'Double') return 0;
            if (type === 'String') return '';
            return false;
        }

        // 表单内的值编辑器（新建/编辑共用），Bool 用下拉、数值用 number、String 用文本
        function valueEditorHTML(type, value) {
            if (type === 'Int' || type === 'Double') {
                const step = type === 'Int' ? '1' : '0.1';
                return `<input type="number" name="variableValue" step="${step}" value="${Number(value) || 0}" aria-label="变量值">`;
            }
            if (type === 'String') {
                return `<input type="text" name="variableValue" value="${escapeHtml(value ?? '')}" placeholder="变量值" aria-label="变量值">`;
            }
            return `
                <select name="variableValue" aria-label="变量值">
                    <option value="false" ${value ? '' : 'selected'}>False</option>
                    <option value="true" ${value ? 'selected' : ''}>True</option>
                </select>
            `;
        }

        function renderCreateValueEditor() {
            elements.createValue.innerHTML = valueEditorHTML(elements.createForm.elements.variableType.value, undefined);
        }

        // 列表行内的即时值编辑器（仿真调试用）
        function renderValueEditor(variable) {
            if (variable.type === 'Int' || variable.type === 'Double') {
                const step = variable.type === 'Int' ? '1' : '0.1';
                return `<input type="number" step="${step}" value="${Number(variable.value) || 0}" data-value-input aria-label="修改 ${escapeHtml(variable.name)} 的值">`;
            }
            if (variable.type === 'String') {
                return `<input type="text" value="${escapeHtml(variable.value ?? '')}" data-value-input aria-label="修改 ${escapeHtml(variable.name)} 的值">`;
            }
            return `
                <output>${variable.value ? 'True' : 'False'}</output>
                <label class="custom-checkbox" title="切换仿真值">
                    <input type="checkbox" ${variable.value ? 'checked' : ''} data-value-input aria-label="切换 ${escapeHtml(variable.name)} 的仿真值">
                    <span class="checkmark"></span>
                </label>
            `;
        }

        function renderList() {
            const api = getVariablesApi();
            if (!api) {
                elements.list.innerHTML = '<div class="variables-list-empty">程序数据加载中…</div>';
                return;
            }
            const variables = api.list();
            if (!variables.length) {
                elements.list.innerHTML = '<div class="variables-list-empty">还没有变量。点击下方「新建变量」创建第一个。</div>';
                return;
            }
            elements.list.innerHTML = variables.map((variable) => `
                <div class="variable-row" data-variable-id="${escapeHtml(variable.id)}">
                    <div class="variable-row-name">
                        <strong title="${escapeHtml(variable.name)}">${escapeHtml(variable.name)}</strong>
                        <span class="variable-type-badge">${escapeHtml(variable.type)}</span>
                        ${variable.readonly ? infoTipHTML(`${variable.origin} · 只读`, `${variable.name} 的来源说明`) : ''}
                    </div>
                    <div class="variable-row-side">
                        <div class="variable-row-value">${renderValueEditor(variable)}</div>
                        ${variable.readonly ? `
                            <button class="variable-action-btn" type="button" disabled title="系统变量由设备自动生成，不可编辑" aria-label="${escapeHtml(variable.name)} 为系统只读变量"><i class="bi bi-three-dots-vertical"></i></button>
                        ` : `
                            <div class="variable-row-menu">
                                <button class="variable-action-btn" type="button" data-menu-toggle title="更多操作" aria-label="${escapeHtml(variable.name)} 的更多操作" aria-haspopup="menu"><i class="bi bi-three-dots-vertical"></i></button>
                                <div class="variable-menu" role="menu" hidden>
                                    <button type="button" role="menuitem" data-edit-variable><i class="bi bi-pencil" aria-hidden="true"></i><span>编辑</span></button>
                                    <button type="button" role="menuitem" class="is-danger" data-delete-variable><i class="bi bi-trash3" aria-hidden="true"></i><span>删除</span></button>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            `).join('');
        }

        function parseInputValue(input, type) {
            if (type === 'Int') return Math.round(Number(input.value) || 0);
            if (type === 'Double') return Number(input.value) || 0;
            if (type === 'String') return input.value;
            if (input.type === 'checkbox') return input.checked;
            return input.value === 'true';
        }

        function closeMenus() {
            elements.list.querySelectorAll('.variable-menu:not([hidden])').forEach((menu) => {
                menu.hidden = true;
            });
        }

        // 编辑模式：名称 + 类型 + 值，类型切换时值编辑器跟随变化
        function startEdit(row, variable) {
            row.classList.add('is-editing');
            row.innerHTML = `
                <form class="variable-edit-form">
                    <div class="variables-create-row">
                        <input type="text" name="variableName" maxlength="24" autocomplete="off" value="${escapeHtml(variable.name)}" aria-label="变量名称">
                        <select name="variableType" aria-label="变量类型">
                            ${VARIABLE_TYPES.map((type) => `<option value="${type}" ${type === variable.type ? 'selected' : ''}>${type}</option>`).join('')}
                        </select>
                    </div>
                    <div class="variables-create-row">
                        <span class="variables-create-value" data-edit-value></span>
                    </div>
                    <div class="variables-create-actions">
                        <button class="panel-secondary-btn" type="button" data-edit-cancel>取消</button>
                        <button class="panel-primary-btn" type="submit">保存</button>
                    </div>
                    <p class="variables-create-error" data-edit-error role="alert"></p>
                </form>
            `;
            const form = row.querySelector('form');
            const valueSlot = form.querySelector('[data-edit-value]');
            const errorSlot = form.querySelector('[data-edit-error]');
            const renderValue = () => {
                const type = form.elements.variableType.value;
                valueSlot.innerHTML = valueEditorHTML(type, type === variable.type ? variable.value : undefined);
            };
            renderValue();
            form.elements.variableType.addEventListener('change', renderValue);
            form.querySelector('[data-edit-cancel]').addEventListener('click', renderList);
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const api = getVariablesApi();
                if (!api) return;
                const type = form.elements.variableType.value;
                const valueInput = form.elements.variableValue;
                const result = api.update(variable.id, {
                    name: form.elements.variableName.value,
                    type,
                    value: valueInput ? parseInputValue(valueInput, type) : defaultValueForType(type)
                });
                if (!result.ok) {
                    errorSlot.textContent = result.message;
                    return;
                }
                renderList();
            });
            form.elements.variableName.focus();
            form.elements.variableName.select();
        }

        // 行内改值（仿真调试用）
        elements.list.addEventListener('change', (event) => {
            const input = event.target.closest('[data-value-input]');
            const row = event.target.closest('[data-variable-id]');
            if (!input || !row) return;
            const api = getVariablesApi();
            const variable = api?.get(row.dataset.variableId);
            if (!api || !variable) return;
            const result = api.setValue(variable.id, parseInputValue(input, variable.type));
            if (!result.ok) showToast(result.message);
        });

        // 三点菜单：编辑 / 删除
        elements.list.addEventListener('click', (event) => {
            const row = event.target.closest('[data-variable-id]');
            if (!row) return;
            const api = getVariablesApi();
            if (!api) return;

            const menuToggle = event.target.closest('[data-menu-toggle]');
            if (menuToggle) {
                const menu = row.querySelector('.variable-menu');
                const willOpen = menu?.hidden;
                closeMenus();
                if (menu && willOpen) menu.hidden = false;
                return;
            }

            if (event.target.closest('[data-delete-variable]')) {
                closeMenus();
                const result = api.remove(row.dataset.variableId);
                if (!result.ok) showToast(result.message);
                return;
            }

            if (event.target.closest('[data-edit-variable]')) {
                closeMenus();
                const variable = api.get(row.dataset.variableId);
                if (variable) startEdit(row, variable);
            }
        });

        // 点击面板外或按 Esc 时收起菜单
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.variable-row-menu')) closeMenus();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeMenus();
        });

        // 新建变量
        elements.createToggle.addEventListener('click', () => {
            elements.createForm.hidden = !elements.createForm.hidden;
            elements.createError.textContent = '';
            if (!elements.createForm.hidden) {
                renderCreateValueEditor();
                elements.createForm.elements.variableName.focus();
            }
        });

        elements.createForm.elements.variableType.addEventListener('change', renderCreateValueEditor);

        elements.createForm.querySelector('[data-create-cancel]').addEventListener('click', () => {
            elements.createForm.hidden = true;
            elements.createForm.reset();
            elements.createError.textContent = '';
        });

        elements.createForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const api = getVariablesApi();
            if (!api) return;
            const type = elements.createForm.elements.variableType.value;
            const valueInput = elements.createForm.elements.variableValue;
            const result = api.add({
                name: elements.createForm.elements.variableName.value,
                type,
                value: valueInput ? parseInputValue(valueInput, type) : defaultValueForType(type)
            });
            if (!result.ok) {
                elements.createError.textContent = result.message;
                return;
            }
            elements.createForm.hidden = true;
            elements.createForm.reset();
            elements.createError.textContent = '';
        });

        // 关闭与拖拽（同设备库面板）
        elements.close.addEventListener('click', () => api.hide());

        elements.header.addEventListener('mousedown', (event) => {
            if (event.target.closest('.panel-close-btn')) return;
            isDragging = true;
            userDragged = true;
            panel.classList.add('dragging');
            const rect = panel.getBoundingClientRect();
            dragOffset.x = event.clientX - rect.left;
            dragOffset.y = event.clientY - rect.top;
            event.preventDefault();
        });

        document.addEventListener('mousemove', (event) => {
            if (!isDragging) return;
            const panelRect = panel.getBoundingClientRect();
            const newLeft = Math.max(-panelRect.width + 50, Math.min(event.clientX - dragOffset.x, window.innerWidth - 50));
            const newTop = Math.max(0, Math.min(event.clientY - dragOffset.y, window.innerHeight - 50));
            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            panel.classList.remove('dragging');
        });

        const api = {
            show() {
                panel.classList.remove('hidden');
                visible = true;
                renderList();
                // 未被手动拖动过时，跟随 3D 仿真窗口的工具栏定位
                if (!userDragged) anchorToToolbar();
                const trigger = document.querySelector('[data-tool="variables"]');
                trigger?.classList.add('active');
                trigger?.setAttribute('aria-expanded', 'true');
            },
            hide() {
                panel.classList.add('hidden');
                visible = false;
                closeMenus();
                const trigger = document.querySelector('[data-tool="variables"]');
                trigger?.classList.remove('active');
                trigger?.setAttribute('aria-expanded', 'false');
            },
            toggle() {
                if (visible) {
                    api.hide();
                    return false;
                }
                api.show();
                return true;
            },
            isVisible: () => visible,
            refresh: renderList
        };

        // 数据就绪与变更同步
        window.addEventListener('hitbot:program-panel-ready', renderList);
        window.addEventListener('hitbot:scene-variables-changed', renderList);

        setInitialPosition();
        renderList();

        window.HitbotVariablesPanel = api;
        return api;
    }

    document.addEventListener('DOMContentLoaded', initVariablesPanel);
})();
