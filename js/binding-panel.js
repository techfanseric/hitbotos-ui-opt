// js/binding-panel.js
// 3D 访问面板绑定弹窗逻辑

const TOPOLOGY_MODEL_DATA = [
    {
        id: 'topology-thress-axis-platform',
        name: 'ThressAxisPlatform_1',
        icon: 'bi-bounding-box',
        type: '拓扑模型',
        port: '拓扑节点 / ThressAxisPlatform_1',
        sceneTarget: null
    },
    {
        id: 'topology-bottle-cap-1',
        name: 'Bottle_cap_1',
        icon: 'bi-box',
        type: '拓扑模型',
        port: '拓扑节点 / Bottle_cap_1',
        sceneTarget: null
    },
    {
        id: 'topology-bottle-cap-2',
        name: 'Bottle_cap_2',
        icon: 'bi-box',
        type: '拓扑模型',
        port: '拓扑节点 / Bottle_cap_2',
        sceneTarget: null
    },
    {
        id: 'topology-bottle-cap-3',
        name: 'Bottle_cap_3',
        icon: 'bi-box',
        type: '拓扑模型',
        port: '拓扑节点 / Bottle_cap_3',
        sceneTarget: null
    },
    {
        id: 'topology-bottle-cap-4',
        name: 'Bottle_cap_4',
        icon: 'bi-box',
        type: '拓扑模型',
        port: '拓扑节点 / Bottle_cap_4',
        sceneTarget: null
    },
    {
        id: 'topology-zmod-1',
        name: 'Z-Mod-SE-54-10SE_1',
        icon: 'bi-hdd-rack',
        type: '拓扑模型',
        port: '拓扑节点 / Z-Mod-SE-54-10SE_1',
        sceneTarget: null
    },
    {
        id: 'topology-zmod-2',
        name: 'Z-Mod-SE-54-10SE_2',
        icon: 'bi-hdd-rack',
        type: '拓扑模型',
        port: '拓扑节点 / Z-Mod-SE-54-10SE_2',
        sceneTarget: null
    }
];

const BLOCKY_SOLUTION_DATA = [
    {
        id: 'solution-grain-sample-platform',
        name: '全自动粮食样本检测平台',
        meta: '含上料、检测、分拣设备'
    },
    {
        id: 'solution-film-laminator',
        name: '贴膜机',
        meta: '含输送、定位、贴膜设备'
    },
    {
        id: 'solution-nucleic-acid-line',
        name: '核酸检测自动化产线',
        meta: '含移液、开盖、扫码设备'
    }
];

class BindingPanel {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.models = TOPOLOGY_MODEL_DATA.map(model => ({ ...model }));
        this.solutions = BLOCKY_SOLUTION_DATA.map(solution => ({ ...solution }));
        this.selectedSolutionId = null;
        this.confirmingSolutionId = null;
        this.selectedModelId = this.models[0].id;
        this.pendingModelId = null;
    }

    init() {
        this.createPanel();
        this.setupEventListeners();
        this.render();
        this.setInitialPosition();
    }

    createPanel() {
        const panelHTML = `
            <div class="binding-panel initial-position hidden" id="bindingPanel" role="dialog" aria-modal="false" aria-labelledby="bindingPanelTitle">
                <div class="panel-header">
                    <div class="panel-title" id="bindingPanelTitle">
                        <i class="bi bi-link"></i>
                        <span>绑定</span>
                    </div>
                    <div class="panel-controls">
                        <button class="panel-close-btn" type="button" title="关闭" aria-label="关闭绑定弹窗">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
                <div class="binding-solution-bar">
                    <label class="binding-solution-label" for="bindingSolutionSelect">绑定方案</label>
                    <select class="binding-solution-select" id="bindingSolutionSelect" data-binding-action="select-solution">
                        <option value="">请选择绑定的方案</option>
                    </select>
                    <div class="binding-solution-meta" id="bindingSolutionMeta">先选择方案后，再进行设备与 3D 模型绑定。</div>
                </div>
                <div class="binding-content" id="bindingContent"></div>
                <div class="binding-confirm hidden" id="bindingConfirm" role="alertdialog" aria-modal="true" aria-labelledby="bindingConfirmTitle">
                    <div class="binding-confirm-card">
                        <div class="binding-confirm-icon"><i class="bi bi-exclamation-triangle"></i></div>
                        <div class="binding-confirm-copy">
                            <strong id="bindingConfirmTitle">切换方案会清空当前绑定</strong>
                            <p>当前方案下已绑定的 3D 模型关系将失效，需要在新方案中重新绑定。</p>
                        </div>
                        <div class="binding-confirm-actions">
                            <button class="binding-secondary-btn" type="button" data-binding-action="cancel-solution-change">取消</button>
                            <button class="binding-danger-btn" type="button" data-binding-action="confirm-solution-change">继续切换</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', panelHTML);
        this.panel = document.getElementById('bindingPanel');
    }

    setInitialPosition() {
        if (!this.panel) return;

        setTimeout(() => {
            this.panel.classList.remove('initial-position');

            const leftToolbar = document.querySelector('.left-toolbar');
            if (!leftToolbar) return;

            const toolbarRect = leftToolbar.getBoundingClientRect();
            const statusBar = document.querySelector('.status-bar');
            const statusBarTop = statusBar ? statusBar.getBoundingClientRect().top : window.innerHeight;
            const panelWidth = Math.min(680, window.innerWidth - 96);
            const availableHeight = statusBarTop - toolbarRect.top;

            this.panel.style.width = `${panelWidth}px`;
            this.panel.style.maxHeight = `${Math.max(420, availableHeight)}px`;
            this.panel.style.left = '76px';
            this.panel.style.top = `${toolbarRect.top}px`;
            this.panel.style.transform = 'none';
        }, 100);
    }

    setupEventListeners() {
        this.panel.querySelector('.panel-close-btn').addEventListener('click', () => this.hide());

        this.panel.addEventListener('click', (event) => {
            event.stopPropagation();

            const item = event.target.closest('.binding-option');
            if (item) {
                this.selectedModelId = item.dataset.id;
                this.render();
                return;
            }

            const action = event.target.closest('[data-binding-action]');
            if (action?.dataset.bindingAction === 'cancel-solution-change') {
                this.closeSolutionConfirm();
                return;
            }

            if (action?.dataset.bindingAction === 'confirm-solution-change') {
                this.confirmSolutionChange();
                return;
            }

            if (action?.dataset.bindingAction === 'start-bind') {
                this.startScenePick();
            }
        });

        this.panel.querySelector('[data-binding-action="select-solution"]').addEventListener('change', (event) => {
            this.requestSolutionChange(event.target.value);
        });

        document.addEventListener('click', (event) => {
            if (!this.pendingModelId) return;
            if (event.target.closest('#bindingPanel')) return;

            // 只有点击了具体的模型对象才完成绑定
            const modelEl = event.target.closest('[data-scene-model-name]');
            if (!modelEl) {
                // 点击空白区域，取消绑定操作，重新显示绑定窗口
                this.cancelScenePick();
                return;
            }

            this.completeScenePick(event);
        });

        window.addEventListener('resize', () => {
            if (this.isVisible) this.setInitialPosition();
        });
    }

    render() {
        if (!this.panel) return;

        this.renderSolutions();
        this.renderContent();
        if (!this.selectedSolutionId) return;

        this.renderModels();
        this.renderSelectedCard();
    }

    renderSolutions() {
        const select = this.panel.querySelector('#bindingSolutionSelect');
        select.innerHTML = [
            '<option value="">请选择绑定的方案</option>',
            ...this.solutions.map(solution => `
                <option value="${this.escapeHTML(solution.id)}">${this.escapeHTML(solution.name)}</option>
            `)
        ].join('');
        select.value = this.selectedSolutionId || '';

        const selectedSolution = this.getSelectedSolution();
        this.panel.querySelector('#bindingSolutionMeta').textContent = selectedSolution
            ? selectedSolution.meta
            : '先选择方案后，再进行设备与 3D 模型绑定。';
    }

    renderContent() {
        const content = this.panel.querySelector('#bindingContent');

        if (!this.selectedSolutionId) {
            content.innerHTML = `
                <div class="binding-empty-state">
                    <i class="bi bi-diagram-3"></i>
                    <strong>请先选择绑定的方案</strong>
                    <span>选择方案后，会加载该方案的拓扑模型，再进行 3D 场景绑定。</span>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="binding-columns" aria-label="拓扑模型绑定">
                <section class="binding-column">
                    <div class="binding-column-title">拓扑图模型</div>
                    <div class="binding-list" data-binding-column="models"></div>
                </section>
                <section class="binding-column binding-action-column">
                    <div class="binding-column-title">绑定操作</div>
                    <div class="binding-action-area">
                        <div class="binding-selected-card" id="bindingSelectedCard"></div>
                        <button class="binding-primary-btn" type="button" data-binding-action="start-bind">
                            <i class="bi bi-link-45deg"></i>
                            <span>绑定</span>
                        </button>
                        <div class="binding-help" id="bindingHelp">选择左侧拓扑模型后，点击绑定，再到 3D 场景里点击对应模型。</div>
                    </div>
                </section>
            </div>
        `;
    }

    renderModels() {
        const list = this.panel.querySelector('[data-binding-column="models"]');
        list.innerHTML = this.models.map(model => `
            <button class="binding-option ${model.id === this.selectedModelId ? 'active' : ''}" type="button" data-id="${model.id}">
                <span class="binding-model-thumb"><i class="bi ${model.icon}"></i></span>
                <span class="binding-option-main">
                    <strong>${this.escapeHTML(model.name)}</strong>
                </span>
                ${model.sceneTarget ? '<span class="binding-chip success">已绑定</span>' : '<span class="binding-chip">未绑定</span>'}
            </button>
        `).join('');
    }

    renderSelectedCard() {
        const model = this.getSelectedModel();
        const isPending = this.pendingModelId === model.id;
        const bindLabel = model.sceneTarget ? '重新绑定' : '绑定';
        const targetText = model.sceneTarget || '暂未绑定 3D 模型';

        this.panel.querySelector('#bindingSelectedCard').innerHTML = `
            <div class="binding-selected-head">
                <span class="binding-selected-thumb"><i class="bi ${model.icon}"></i></span>
                <div>
                    <strong>${this.escapeHTML(model.name)}</strong>
                    <small>${this.escapeHTML(model.port)}</small>
                </div>
            </div>
            <div class="binding-selected-row">
                <span>类型</span>
                <strong>${this.escapeHTML(model.type)}</strong>
            </div>
            <div class="binding-selected-row">
                <span>3D 模型</span>
                <strong>${this.escapeHTML(targetText)}</strong>
            </div>
        `;

        const actionButton = this.panel.querySelector('[data-binding-action="start-bind"]');
        actionButton.classList.toggle('waiting', isPending);
        actionButton.querySelector('span').textContent = isPending ? '等待点击 3D 模型' : bindLabel;

        this.panel.querySelector('#bindingHelp').textContent = isPending
            ? '请在 3D 场景里点击对应模型，点击后会自动完成绑定。'
            : '点击绑定后，再去 3D 场景里点击对应模型。';
    }

    startScenePick() {
        if (!this.selectedSolutionId) return;
        this.pendingModelId = this.selectedModelId;
        document.querySelector('.viewport-3d')?.classList.add('binding-panel-open', 'binding-pick-mode');
        // 临时隐藏绑定窗口，让用户能看清 3D 场景
        this.panel.classList.add('hidden');
        this.render();
    }

    cancelScenePick() {
        this.pendingModelId = null;
        document.querySelector('.viewport-3d')?.classList.remove('binding-pick-mode');
        document.querySelector('.viewport-3d')?.classList.add('binding-panel-open');
        // 重新显示绑定窗口
        this.panel.classList.remove('hidden');
        this.render();
    }

    completeScenePick(event) {
        const model = this.models.find(item => item.id === this.pendingModelId);
        if (!model) return;

        const sceneName = event.target.closest('[data-scene-model-name]')?.dataset.sceneModelName || '3D模型占位';
        model.sceneTarget = sceneName;
        this.pendingModelId = null;
        document.querySelector('.viewport-3d')?.classList.remove('binding-pick-mode');
        document.querySelector('.viewport-3d')?.classList.add('binding-panel-open');
        this.selectedModelId = model.id;
        // 重新显示绑定窗口
        this.panel.classList.remove('hidden');
        this.render();
    }

    getSelectedModel() {
        return this.models.find(model => model.id === this.selectedModelId) || this.models[0];
    }

    getSelectedSolution() {
        return this.solutions.find(solution => solution.id === this.selectedSolutionId) || null;
    }

    hasActiveBindings() {
        return this.models.some(model => Boolean(model.sceneTarget));
    }

    requestSolutionChange(nextSolutionId) {
        if (nextSolutionId === this.selectedSolutionId) return;

        const select = this.panel.querySelector('#bindingSolutionSelect');
        select.value = this.selectedSolutionId || '';

        if (!nextSolutionId) {
            if (this.hasActiveBindings()) {
                this.confirmingSolutionId = '';
                this.openSolutionConfirm();
                return;
            }

            this.applySolutionChange('');
            return;
        }

        if (this.selectedSolutionId && this.hasActiveBindings()) {
            this.confirmingSolutionId = nextSolutionId;
            this.openSolutionConfirm();
            return;
        }

        this.applySolutionChange(nextSolutionId);
    }

    applySolutionChange(nextSolutionId) {
        this.selectedSolutionId = nextSolutionId || null;
        this.confirmingSolutionId = null;
        this.clearBindings();
        this.closeSolutionConfirm();
        this.render();
    }

    clearBindings() {
        this.models = TOPOLOGY_MODEL_DATA.map(model => ({ ...model }));
        this.selectedModelId = this.models[0].id;
        this.pendingModelId = null;
        document.querySelector('.viewport-3d')?.classList.remove('binding-pick-mode');
    }

    openSolutionConfirm() {
        this.panel.querySelector('#bindingConfirm').classList.remove('hidden');
    }

    closeSolutionConfirm() {
        this.confirmingSolutionId = null;
        this.panel.querySelector('#bindingConfirm').classList.add('hidden');
        this.panel.querySelector('#bindingSolutionSelect').value = this.selectedSolutionId || '';
    }

    confirmSolutionChange() {
        this.applySolutionChange(this.confirmingSolutionId || '');
    }

    toggle() {
        this.isVisible ? this.hide() : this.show();
    }

    show() {
        this.panel.classList.remove('hidden');
        this.isVisible = true;
        document.querySelector('.viewport-3d')?.classList.add('binding-panel-open');
        this.setInitialPosition();
    }

    hide() {
        this.panel.classList.add('hidden');
        this.isVisible = false;
        this.pendingModelId = null;
        document.querySelector('.viewport-3d')?.classList.remove('binding-panel-open', 'binding-pick-mode');
        document.querySelector('[data-tool="bind"]')?.classList.remove('active');
    }

    escapeHTML(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

let bindingPanel = null;

export function initBindingPanel() {
    if (!bindingPanel) {
        bindingPanel = new BindingPanel();
        bindingPanel.init();
    }
    return bindingPanel;
}

export function getBindingPanel() {
    return bindingPanel;
}
