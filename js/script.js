// 仿真面板 - 核心功能脚本

// 布局管理器实例
let layoutManager = null;

// 属性面板当前激活的tab
let activePanelTab = null;

const EXECUTION_CONTEXT_STORAGE_KEY = 'hitbot-execution-context-v3';
const DEFAULT_EXECUTION_CONTEXT = {
    machineConnected: false,
    machineLabel: '真机未连接',
    activeSource: 'blockly',
    contexts: {
        blockly: {
            targets: [],
            runState: 'idle',
            lastAction: 'idle',
            feedback: '请先勾选真机执行或仿真运行。'
        },
        flow: {
            targets: [],
            runState: 'idle',
            lastAction: 'idle',
            feedback: '请先勾选真机执行或仿真运行。'
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const pageLayout = new URLSearchParams(window.location.search).get('layout');

    if (pageLayout) {
        document.body.classList.add(`layout-${pageLayout}`);
    }

    // 初始化布局管理器
    layoutManager = new LayoutManager();
    layoutManager.setCallbacks({
        onWindowControlUpdate: updateWindowControlButton,
        onStatusBarUpdate: updateStatusBarWindowStates,
        onUpdateAllWindowControls: updateAllWindowControls
    });
    
    setupWindowControls();
    setupTimelineToggle();
    setupToolbarControls();
    setupToolbarResponsive();
    setupArmPropertyPanel();
    setupWindowSwapControls();
    initializeWindowStates();
    setupPanelTabs();
    window.initActionEditorShell?.();

    // 初始化设备库面板
    import('./device-library-panel.js').then(module => {
        window.initDeviceLibraryPanel = module.initDeviceLibraryPanel;
        window.getDeviceLibraryPanel = module.getDeviceLibraryPanel;
        window.initDeviceLibraryPanel();
    });

    // 初始化 3D 绑定弹窗
    import('./binding-panel.js').then(module => {
        window.initBindingPanel = module.initBindingPanel;
        window.getBindingPanel = module.getBindingPanel;
        window.initBindingPanel();
    });
    
    // 确保所有窗口控制状态正确
    updateAllWindowControls();
    
    // 调试项目下拉菜单
    setupProjectDropdown();
    setupTopMenuInteractions();
    setupExecutionEnhancements();
});

function summarizeExecutionTargets(targets) {
    if (targets.includes('real') && targets.includes('simulation')) return '孪生';

    const labels = [];
    if (targets.includes('real')) labels.push('真机');
    if (targets.includes('simulation')) labels.push('仿真');
    return labels.length ? labels.join(' + ') : '未选择';
}

function getExecutionSourceLabel(source) {
    return source === 'flow' ? '流程图' : 'Blockly';
}

function getExecutionClusterLabel(source) {
    return source === 'flow' ? '流程' : '程序';
}

function normalizeExecutionUnit(rawUnit) {
    const base = {
        targets: [],
        runState: 'idle',
        lastAction: 'idle',
        feedback: '请先勾选真机执行或仿真运行。',
        ...(rawUnit || {})
    };
    const validTargets = ['real', 'simulation'];
    const nextTargets = Array.isArray(base.targets)
        ? base.targets.filter((target, index, list) => validTargets.includes(target) && list.indexOf(target) === index)
        : [];

    base.targets = nextTargets;
    base.runState = ['idle', 'compiling', 'downloading', 'running', 'paused'].includes(base.runState) ? base.runState : 'idle';

    if (typeof base.feedback !== 'string' || !base.feedback.trim()) {
        base.feedback = '请先勾选真机执行或仿真运行。';
    }

    return base;
}

function normalizeExecutionContext(rawContext) {
    const merged = {
        ...DEFAULT_EXECUTION_CONTEXT,
        ...(rawContext || {}),
        contexts: {
            ...DEFAULT_EXECUTION_CONTEXT.contexts,
            ...((rawContext && rawContext.contexts) || {})
        }
    };

    merged.activeSource = ['blockly', 'flow'].includes(merged.activeSource) ? merged.activeSource : 'blockly';
    merged.contexts.blockly = normalizeExecutionUnit(merged.contexts.blockly);
    merged.contexts.flow = normalizeExecutionUnit(merged.contexts.flow);

    return merged;
}

function loadExecutionContext() {
    try {
        const saved = window.localStorage.getItem(EXECUTION_CONTEXT_STORAGE_KEY);
        return normalizeExecutionContext(saved ? JSON.parse(saved) : null);
    } catch (error) {
        console.warn('读取执行配置失败，使用默认值。', error);
        return normalizeExecutionContext(null);
    }
}

function saveExecutionContext(context) {
    try {
        const stableContext = JSON.parse(JSON.stringify(context));
        Object.values(stableContext.contexts || {}).forEach((unit) => {
            if (['compiling', 'downloading'].includes(unit.runState)) {
                unit.runState = 'idle';
                unit.lastAction = 'idle';
            }
        });
        window.localStorage.setItem(EXECUTION_CONTEXT_STORAGE_KEY, JSON.stringify(stableContext));
    } catch (error) {
        console.warn('保存执行配置失败。', error);
    }
}

function getExecutionStateLabel(runState) {
    if (runState === 'compiling') return '状态：编译中';
    if (runState === 'downloading') return '状态：下载中';
    if (runState === 'running') return '状态：运行中';
    if (runState === 'paused') return '状态：已暂停';
    return '状态：未运行';
}

function getExecutionStateShortLabel(runState) {
    return getExecutionStateLabel(runState).replace(/^状态：/u, '');
}

function canExecuteTargets(targets) {
    return Array.isArray(targets) && targets.length > 0;
}

function isExecutionBusyState(runState) {
    return ['compiling', 'downloading', 'running'].includes(runState);
}

function setupExecutionEnhancements() {
    const summaryBadges = [...document.querySelectorAll('[data-run-summary]')];
    const stateBadges = [...document.querySelectorAll('[data-run-state-badge]')];
    let context = loadExecutionContext();
    const listeners = new Set();
    const runProgressTimers = new Map();

    const clearRunProgress = (source) => {
        const timers = runProgressTimers.get(source) || [];
        timers.forEach((timer) => window.clearTimeout(timer));
        runProgressTimers.delete(source);
    };

    const queueRunProgress = (source) => {
        clearRunProgress(source);
        const unit = context.contexts[source];
        const hasRealTarget = unit.targets.includes('real');
        const steps = hasRealTarget
            ? [
                { delay: 900, state: 'downloading', action: 'download', feedback: `正在下载到 ${summarizeExecutionTargets(unit.targets)}。` },
                { delay: 2100, state: 'running', action: 'run', feedback: `已开始运行，当前目标：${summarizeExecutionTargets(unit.targets)}。` }
            ]
            : [
                { delay: 900, state: 'running', action: 'run', feedback: `已开始运行，当前目标：${summarizeExecutionTargets(unit.targets)}。` }
            ];

        const timers = steps.map((step) => window.setTimeout(() => {
            const nextUnit = context.contexts[source];
            if (!nextUnit || !['compiling', 'downloading'].includes(nextUnit.runState)) return;
            nextUnit.runState = step.state;
            nextUnit.lastAction = step.action;
            nextUnit.feedback = step.feedback;
            render();
            if (step.state === 'running') {
                clearRunProgress(source);
            }
        }, step.delay));

        runProgressTimers.set(source, timers);
    };

    const render = () => {
        context = normalizeExecutionContext(context);
        saveExecutionContext(context);

        const activeSource = context.activeSource;
        const activeUnit = context.contexts[activeSource];
        const targetSummary = summarizeExecutionTargets(activeUnit.targets);
        const stateLabel = getExecutionStateLabel(activeUnit.runState);

        document.body.dataset.runTargets = activeUnit.targets.join(',');
        document.body.dataset.runState = activeUnit.runState;
        document.body.dataset.runSource = activeSource;
        window.dispatchEvent(new CustomEvent('hitbot:execution-context-change', { detail: JSON.parse(JSON.stringify(context)) }));

        summaryBadges.forEach((badge) => {
            badge.textContent = `运行模式：${targetSummary}`;
        });

        stateBadges.forEach((badge) => {
            badge.textContent = stateLabel;
            badge.classList.remove('is-idle', 'is-built', 'is-compiling', 'is-downloading', 'is-running', 'is-paused', 'is-error');
            if (activeUnit.runState === 'running') {
                badge.classList.add('is-running');
            } else if (activeUnit.runState === 'compiling') {
                badge.classList.add('is-compiling');
            } else if (activeUnit.runState === 'downloading') {
                badge.classList.add('is-downloading');
            } else if (activeUnit.runState === 'paused') {
                badge.classList.add('is-paused');
            } else {
                badge.classList.add('is-idle');
            }
        });

        listeners.forEach((listener) => {
            listener(JSON.parse(JSON.stringify(context)));
        });
    };

    const api = {
        getContext(source) {
            const nextSource = ['blockly', 'flow'].includes(source) ? source : context.activeSource;
            return {
                source: nextSource,
                machineConnected: context.machineConnected,
                machineLabel: context.machineLabel,
                activeSource: context.activeSource,
                ...JSON.parse(JSON.stringify(context.contexts[nextSource]))
            };
        },
        setActiveSource(source) {
            if (!['blockly', 'flow'].includes(source) || context.activeSource === source) return;
            context.activeSource = source;
            render();
        },
        setTargets(source, nextTargets, feedback) {
            const nextSource = ['blockly', 'flow'].includes(source) ? source : context.activeSource;
            clearRunProgress(nextSource);
            context.activeSource = nextSource;
            context.contexts[nextSource].targets = nextTargets;
            context.contexts[nextSource].runState = 'idle';
            context.contexts[nextSource].lastAction = 'target-change';
            context.contexts[nextSource].feedback = feedback || (
                canExecuteTargets(context.contexts[nextSource].targets)
                    ? `已勾选 ${summarizeExecutionTargets(context.contexts[nextSource].targets)}。`
                    : '请先勾选真机执行或仿真运行。'
            );
            render();
        },
        markRun(source, feedback) {
            const nextSource = ['blockly', 'flow'].includes(source) ? source : context.activeSource;
            clearRunProgress(nextSource);
            context.activeSource = nextSource;
            if (!canExecuteTargets(context.contexts[nextSource].targets)) {
                context.contexts[nextSource].runState = 'idle';
                context.contexts[nextSource].lastAction = 'run-blocked';
                context.contexts[nextSource].feedback = '请先勾选真机执行或仿真运行。';
                render();
                return;
            }
            context.contexts[nextSource].runState = 'compiling';
            context.contexts[nextSource].lastAction = 'compile';
            context.contexts[nextSource].feedback = feedback || `正在编译，当前目标：${summarizeExecutionTargets(context.contexts[nextSource].targets)}。`;
            render();
            queueRunProgress(nextSource);
        },
        markPause(source, feedback) {
            const nextSource = ['blockly', 'flow'].includes(source) ? source : context.activeSource;
            clearRunProgress(nextSource);
            context.activeSource = nextSource;
            context.contexts[nextSource].runState = 'paused';
            context.contexts[nextSource].lastAction = 'pause';
            context.contexts[nextSource].feedback = feedback || `已暂停执行，当前目标：${summarizeExecutionTargets(context.contexts[nextSource].targets)}。`;
            render();
        },
        markResume(source, feedback) {
            const nextSource = ['blockly', 'flow'].includes(source) ? source : context.activeSource;
            clearRunProgress(nextSource);
            context.activeSource = nextSource;
            if (!canExecuteTargets(context.contexts[nextSource].targets)) {
                context.contexts[nextSource].runState = 'idle';
                context.contexts[nextSource].lastAction = 'resume-blocked';
                context.contexts[nextSource].feedback = '请先勾选真机执行或仿真运行。';
                render();
                return;
            }
            context.contexts[nextSource].runState = 'running';
            context.contexts[nextSource].lastAction = 'resume';
            context.contexts[nextSource].feedback = feedback || `已恢复执行，当前目标：${summarizeExecutionTargets(context.contexts[nextSource].targets)}。`;
            render();
        },
        markStop(source, feedback) {
            const nextSource = ['blockly', 'flow'].includes(source) ? source : context.activeSource;
            clearRunProgress(nextSource);
            context.activeSource = nextSource;
            context.contexts[nextSource].runState = 'idle';
            context.contexts[nextSource].lastAction = 'stop';
            context.contexts[nextSource].feedback = feedback || `已停止运行，当前目标：${summarizeExecutionTargets(context.contexts[nextSource].targets)}。`;
            render();
        },
        onChange(listener) {
            listeners.add(listener);
            listener(JSON.parse(JSON.stringify(context)));
            return () => listeners.delete(listener);
        }
    };

    window.__hitbotExecutionContext = api;
    bindActionEditorRunControls(api);

    render();
}

function createEmbeddedRunControlStyles(doc) {
    if (!doc || doc.getElementById('host-run-target-style')) return;

    const style = doc.createElement('style');
    style.id = 'host-run-target-style';
    style.textContent = `
        .host-run-target-wrap {
            display: inline-flex;
            align-items: center;
            margin-left: 0;
            min-width: 0;
        }
        .host-run-inline-group {
            display: inline-flex;
            align-items: center;
            min-height: 22px;
            overflow: visible;
            margin-left: 8px;
            padding-left: 8px;
            gap: 0;
            position: relative;
        }
        .host-run-inline-group::before {
            content: none;
            position: absolute;
            left: 0;
            top: 50%;
            width: 1px;
            height: 14px;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.14);
        }
        .host-run-inline-group[data-host-run-inline="blockly"] {
            margin-left: 4px;
            padding-left: 8px;
        }
        .host-run-inline-group[data-host-run-inline="blockly"]::before {
            display: none;
        }
        .host-run-inline-group[data-host-run-inline="blockly"] + .arco-space-item {
            margin-left: 4px;
        }
        .host-run-inline-group > .arco-space-item > button[data-host-run-bound="true"],
        .host-run-inline-group > .arco-space-item > button[data-host-stop-bound="true"] {
            border: none;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
            height: 22px;
            padding: 0;
            color: #3C7EFF;
            font-size: 11px;
        }
        .host-run-inline-group > .arco-space-item > button[data-host-run-bound="true"]:hover,
        .host-run-inline-group > .arco-space-item > button[data-host-stop-bound="true"]:hover {
            background: rgba(255, 255, 255, 0.08);
        }
        .host-run-cluster-divider {
            width: 0;
            height: 14px;
            margin: 0 4px;
            align-self: center;
            background: transparent;
        }
        .host-run-inline-group.is-disabled {
            opacity: 0.72;
        }
        .host-run-target-group {
            display: inline-flex;
            align-items: center;
            gap: 0;
        }
        .host-run-target-item {
            border: none;
            border-radius: 0;
            background: transparent;
            padding: 0 7px 0 6px;
            height: 22px;
            display: flex;
            align-items: center;
            gap: 5px;
            color: rgba(255,255,255,0.82);
            cursor: pointer;
            font-size: 10px;
            line-height: 1;
            transition: background-color 0.16s ease, color 0.16s ease;
        }
        .host-run-target-item:hover {
            background: rgba(255, 255, 255, 0.08);
        }
        .host-run-target-item.is-disabled,
        .host-run-target-item:disabled,
        .host-run-target-item.is-locked {
            cursor: not-allowed;
        }
        .host-run-target-item.is-disabled:hover,
        .host-run-target-item:disabled:hover,
        .host-run-target-item.is-locked:hover {
            background: transparent;
        }
        .host-run-target-item.is-active {
            background: transparent;
            color: rgba(255,255,255,0.82);
        }
        .host-run-target-check {
            width: 12px;
            height: 12px;
            border: 0;
            border-radius: 3px;
            flex: 0 0 auto;
            background: rgba(255,255,255,0.12);
            transition: all 0.16s ease;
            position: relative;
        }
        .host-run-target-item.is-active .host-run-target-check::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 6px;
            height: 6px;
            background: #3C7EFF;
            border-radius: 2px;
            transform: translate(-50%, -50%);
        }
        .host-run-target-title {
            font-size: 10px;
            line-height: 1;
            font-weight: 500;
        }
        .host-run-hidden {
            display: none !important;
        }
        .host-run-tooltip-popup {
            pointer-events: none;
        }
        .arco-layout-header > .arco-tabs .arco-tabs-nav > .arco-tabs-nav-tab {
            display: none;
        }
        .arco-layout-header > .arco-tabs .arco-tabs-nav {
            display: flex;
            align-items: center;
            overflow: visible;
        }
        .arco-layout-header > .arco-tabs {
            overflow: visible;
        }
        .arco-layout-header > .arco-tabs .arco-tabs-nav > .arco-tabs-nav-extra {
            margin-left: auto;
        }
        .host-blockly-program-switcher {
            display: inline-flex;
            align-items: center;
            position: relative;
            flex: 0 0 auto;
            min-width: 0;
            margin-right: 12px;
            gap: 8px;
        }
        .host-blockly-program-static-label {
            color: rgba(255,255,255,0.58);
            font-size: 12px;
            line-height: 1;
            white-space: nowrap;
        }
        .host-blockly-program-trigger {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            height: 24px;
            width: max-content;
            min-width: 0;
            max-width: 280px;
            padding: 0 8px;
            border: 0;
            border-radius: 4px;
            color: rgba(255,255,255,0.9);
            background: rgba(255,255,255,0.07);
            cursor: pointer;
            font-size: 12px;
            line-height: 1;
            transition: background-color 0.16s ease;
        }
        .host-blockly-program-trigger:hover,
        .host-blockly-program-switcher.is-open .host-blockly-program-trigger {
            background: rgba(60, 126, 255, 0.14);
        }
        .host-blockly-program-name {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 600;
        }
        .host-blockly-program-caret {
            width: 8px;
            height: 8px;
            margin-left: auto;
            border: 0;
            background: rgba(255,255,255,0.56);
            clip-path: polygon(0 25%, 100% 25%, 50% 75%);
            flex: 0 0 auto;
        }
        .host-blockly-program-state {
            display: inline-flex;
            align-items: center;
            height: 16px;
            padding: 0 5px;
            border-radius: 4px;
            color: #ff9a9a;
            background: rgba(255, 77, 79, 0.14);
            font-size: 10px;
            line-height: 1;
            white-space: nowrap;
            flex: 0 0 auto;
        }
        .host-blockly-program-state.is-running {
            color: #7BE0A6;
            background: rgba(35, 195, 112, 0.16);
        }
        .host-blockly-program-state.is-compiling,
        .host-blockly-program-state.is-downloading {
            color: #ffd37a;
            background: rgba(255, 183, 77, 0.16);
        }
        .host-blockly-program-state.is-paused {
            color: #8fb8ff;
            background: rgba(60, 126, 255, 0.16);
        }
        .host-blockly-program-menu {
            display: none;
            position: absolute;
            top: 34px;
            left: 0;
            z-index: 1002;
            min-width: 190px;
            padding: 4px;
            border: 0;
            border-radius: 6px;
            background: #2f3136;
            box-shadow: 0 8px 20px rgba(0,0,0,0.28);
        }
        .host-blockly-program-switcher.is-open .host-blockly-program-menu {
            display: block;
        }
        .host-blockly-program-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            height: 28px;
            padding: 0 8px;
            border: none;
            border-radius: 4px;
            color: rgba(255,255,255,0.82);
            background: transparent;
            cursor: pointer;
            font-size: 12px;
            text-align: left;
        }
        .host-blockly-program-option-name {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .host-blockly-program-option-state {
            display: inline-flex;
            align-items: center;
            height: 16px;
            padding: 0 5px;
            border-radius: 4px;
            color: rgba(255,255,255,0.62);
            background: rgba(255,255,255,0.06);
            font-size: 10px;
            line-height: 1;
            white-space: nowrap;
            flex: 0 0 auto;
        }
        .host-blockly-program-option:hover {
            background: rgba(255,255,255,0.08);
        }
        .host-blockly-program-option.is-active {
            color: #fff;
            background: rgba(60, 126, 255, 0.22);
        }
        .host-blockly-left-edit {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 28px;
            padding-left: 10px;
            border-left: 0;
            color: rgba(255,255,255,0.68);
            font-size: 11px;
            line-height: 1;
        }
        .host-blockly-toolbar-group {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            gap: 0;
            position: relative;
        }
        .host-blockly-toolbar-group + .host-blockly-toolbar-group,
        .host-blockly-toolbar-group + .host-run-inline-group {
            margin-left: 8px;
            padding-left: 8px;
        }
        .host-blockly-toolbar-group + .host-blockly-toolbar-group::before,
        .host-blockly-toolbar-group + .host-run-inline-group::before {
            content: none;
            position: absolute;
            left: 0;
            top: 50%;
            width: 1px;
            height: 14px;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.14);
        }
        .host-blockly-edit-toggle {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 22px;
            color: rgba(255,255,255,0.68);
            font-size: 11px;
            line-height: 1;
        }
        .host-blockly-edit-state {
            display: inline-flex;
            align-items: center;
            height: 22px;
            margin-right: 4px;
            padding: 0 7px;
            border-radius: 4px;
            color: rgba(255,255,255,0.72);
            background: rgba(255,255,255,0.06);
            font-size: 11px;
            line-height: 1;
        }
        .host-blockly-edit-state.is-editable {
            color: #7BE0A6;
            background: rgba(35, 195, 112, 0.14);
        }
    `;
    doc.head?.appendChild(style);
}

function setupEmbeddedRunTooltip(doc) {
    if (!doc || doc.body?.dataset.hostRunTooltipBound === 'true') return;

    const tooltip = doc.createElement('div');
    tooltip.className = 'arco-trigger-popup arco-trigger-position-bottom arco-tooltip host-run-tooltip-popup';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '1001';
    tooltip.style.pointerEvents = 'none';
    tooltip.innerHTML = `
        <div class="arco-trigger-popup-wrapper" style="transform-origin: 50% 0px;">
            <div class="arco-trigger-content arco-tooltip-content"></div>
            <div class="arco-trigger-arrow arco-tooltip-popup-arrow" style="top: 0px; transform: translate(-50%, -50%) rotate(45deg);"></div>
        </div>
    `;
    doc.body.appendChild(tooltip);
    doc.body.dataset.hostRunTooltipBound = 'true';

    const hideTooltip = () => {
        tooltip.style.display = 'none';
    };

    const showTooltip = (target) => {
        const content = target.dataset.hostTooltip;
        if (!content) return;

        const contentEl = tooltip.querySelector('.arco-tooltip-content');
        const arrowEl = tooltip.querySelector('.arco-tooltip-popup-arrow');
        contentEl.textContent = content;
        tooltip.style.display = 'block';
        tooltip.style.visibility = 'hidden';
        tooltip.style.left = '0px';
        tooltip.style.top = '0px';

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        const nextLeft = Math.max(6, Math.min(left, doc.documentElement.clientWidth - tooltipRect.width - 6));
        const top = targetRect.bottom + 8;
        tooltip.style.left = `${nextLeft}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.visibility = 'visible';
        if (arrowEl) {
            const arrowLeft = targetRect.left + targetRect.width / 2 - nextLeft;
            arrowEl.style.left = `${Math.max(8, Math.min(arrowLeft, tooltipRect.width - 8))}px`;
        }
    };

    doc.addEventListener('mouseenter', (event) => {
        const target = event.target.closest?.('[data-host-tooltip]');
        if (target) showTooltip(target);
    }, true);

    doc.addEventListener('mouseleave', (event) => {
        const target = event.target.closest?.('[data-host-tooltip]');
        if (target) hideTooltip();
    }, true);

    doc.addEventListener('focusin', (event) => {
        const target = event.target.closest?.('[data-host-tooltip]');
        if (target) showTooltip(target);
    });

    doc.addEventListener('focusout', hideTooltip);
    doc.addEventListener('scroll', hideTooltip, true);
    doc.defaultView?.addEventListener('resize', hideTooltip);
}

function createRunTargetMenu(doc, api, kind) {
    setupEmbeddedRunTooltip(doc);

    const wrap = doc.createElement('div');
    wrap.className = 'host-run-target-wrap';
    wrap.dataset.hostRunControl = kind;
    wrap.innerHTML = `
        <div class="host-run-target-group" role="group" aria-label="执行目标">
            <button class="host-run-target-item" type="button" data-run-target="real" role="checkbox" aria-checked="false">
                <span class="host-run-target-check" aria-hidden="true"></span>
                <span class="host-run-target-title">真机</span>
            </button>
            <button class="host-run-target-item" type="button" data-run-target="simulation" role="checkbox" aria-checked="false">
                <span class="host-run-target-check" aria-hidden="true"></span>
                <span class="host-run-target-title">仿真</span>
            </button>
        </div>
    `;

    const items = [...wrap.querySelectorAll('[data-run-target]')];

    items.forEach((item) => {
        item.addEventListener('click', () => {
            if (item.disabled || item.classList.contains('is-locked')) {
                return;
            }

            const target = item.dataset.runTarget;
            const current = api.getContext(kind);
            let nextTargets;

            if (current.targets.includes(target)) {
                nextTargets = current.targets.filter((entry) => entry !== target);
            } else {
                nextTargets = [...current.targets, target];
            }

            api.setTargets(kind, nextTargets, nextTargets.length
                ? `已勾选 ${summarizeExecutionTargets(nextTargets)}。`
                : '请先勾选真机执行或仿真运行。'
            );
        });
    });

    api.onChange((nextContext) => {
        const unit = nextContext.contexts[kind];
        items.forEach((item) => {
            const target = item.dataset.runTarget;
            const isActive = unit.targets.includes(target);
            const isLocked = isExecutionBusyState(unit.runState);
            item.disabled = false;
            item.classList.toggle('is-disabled', false);
            item.classList.toggle('is-locked', isLocked);
            item.classList.toggle('is-active', isActive);
            item.setAttribute('aria-checked', String(isActive));
            const baseTitle = item.querySelector('.host-run-target-title').textContent;
            let tooltipText;
            if (isLocked) {
                tooltipText = `${baseTitle}（执行中不可修改）`;
            } else if (isActive) {
                tooltipText = `${baseTitle}（已选中）`;
            } else {
                tooltipText = `${baseTitle}（未选中）`;
            }
            item.dataset.hostTooltip = tooltipText;
            item.setAttribute('aria-label', tooltipText);
        });
    });

    return wrap;
}

function syncExecuteButtonState(button, kind, api) {
    if (!button) return;
    const current = api.getContext(kind);
    const isRunning = current.runState === 'running';
    const isCompiling = current.runState === 'compiling';
    const isDownloading = current.runState === 'downloading';
    const isPaused = current.runState === 'paused';
    const canRun = canExecuteTargets(current.targets);
    const isPreparing = isCompiling || isDownloading;
    const inlineGroup = button.closest('.host-run-inline-group');
    const hostItem = button.closest('.arco-space-item');
    const stopButton = inlineGroup?.querySelector('button[data-host-stop-bound="true"]');
    const actionLabel = isCompiling ? '编译中' : (isDownloading ? '下载中' : (isRunning ? '暂停执行' : (isPaused ? '恢复执行' : (canRun ? '运行' : '请先选择运行模式'))));

    const iconButton = button.querySelector('.arco-icon-play-circle, .arco-icon-pause-circle');
    if (kind === 'flow' || iconButton) {
        const icon = button.querySelector('.arco-icon-play-circle, .arco-icon-pause-circle');
        if (icon) {
            icon.classList.remove('arco-icon-play-circle', 'arco-icon-pause-circle');
            icon.classList.add((isRunning || isPreparing) ? 'arco-icon-pause-circle' : 'arco-icon-play-circle');
            icon.innerHTML = (isRunning || isPreparing)
                ? '<path d="M42 24c0 9.941-8.059 18-18 18S6 33.941 6 24 14.059 6 24 6s18 8.059 18 18Z"></path><path d="M19 19v10h1V19h-1ZM28 19v10h1V19h-1Z"></path>'
                : '<path d="M24 42c9.941 0 18-8.059 18-18S33.941 6 24 6 6 14.059 6 24s8.059 18 18 18Z"></path><path d="M19 17v14l12-7-12-7Z"></path>';
        }
    } else {
        button.textContent = isCompiling ? '编译中' : (isDownloading ? '下载中' : (isRunning ? '暂停' : (isPaused ? '恢复' : '运行')));
    }
    button.removeAttribute('title');
    button.setAttribute('aria-label', actionLabel);
    if (!canRun && !isRunning && !isPaused && !isPreparing && hostItem) {
        hostItem.dataset.hostTooltip = actionLabel;
        hostItem.setAttribute('aria-label', actionLabel);
    } else if (hostItem) {
        delete hostItem.dataset.hostTooltip;
        hostItem.removeAttribute('aria-label');
    }

    button.disabled = isPreparing || (!isRunning && !isPaused && !canRun);
    button.classList.toggle('arco-btn-disabled', isPreparing || (!isRunning && !isPaused && !canRun));
    inlineGroup?.classList.toggle('is-disabled', !canRun && !isRunning && !isPreparing);
    if (stopButton) {
        stopButton.classList.add('host-run-hidden');
    }
}

function findVisibleButton(doc, predicate) {
    const candidates = [...doc.querySelectorAll('button')].filter((button) => predicate(button));
    if (!candidates.length) return null;

    const preferred = candidates.find((button) => {
        const modal = button.closest('.arco-modal, .arco-drawer, .arco-popover, .arco-tooltip, .arco-dropdown');
        return !modal;
    });

    return preferred || candidates[0] || null;
}

function getBlocklyProgramTabs(doc) {
    const ignoreLabels = new Set(['Python', '运行日志', '实时变量', '运行结果']);
    return [...doc.querySelectorAll('.arco-layout-header .arco-tabs-nav-tab-list > .arco-tabs-tab')]
        .map((tab) => {
            const rawLabel = tab.innerText.trim().replace(/\s+/g, ' ');
            const label = rawLabel.replace(/\(只读\)$/u, '').trim();
            return {
                tab,
                label,
                isActive: tab.classList.contains('arco-tabs-tab-active')
            };
        })
        .filter((item) => item.label && !ignoreLabels.has(item.label));
}

function installBlocklyProgramSwitcher(doc) {
    const nav = doc.querySelector('.arco-layout-header .arco-tabs-nav');
    const navTab = nav?.querySelector(':scope > .arco-tabs-nav-tab');
    if (!nav || !navTab) return null;

    let switcher = nav.querySelector(':scope > .host-blockly-program-switcher');
    if (!switcher) {
        switcher = doc.createElement('div');
        switcher.className = 'host-blockly-program-switcher';
        switcher.innerHTML = `
            <span class="host-blockly-program-static-label">当前程序</span>
            <button class="host-blockly-program-trigger" type="button" data-host-tooltip="切换当前程序" aria-haspopup="listbox" aria-expanded="false">
                <span class="host-blockly-program-name"></span>
                <span class="host-blockly-program-state is-idle" data-host-tooltip="运行状态：未运行" aria-label="运行状态：未运行">未运行</span>
                <span class="host-blockly-program-caret" aria-hidden="true"></span>
            </button>
            <div class="host-blockly-program-menu" role="listbox"></div>
        `;
        nav.insertBefore(switcher, navTab);
        const trigger = switcher.querySelector('.host-blockly-program-trigger');
        trigger.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = switcher.classList.toggle('is-open');
            trigger.setAttribute('aria-expanded', String(isOpen));
        });
        doc.addEventListener('click', (event) => {
            if (!switcher.contains(event.target)) {
                switcher.classList.remove('is-open');
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
        doc.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                switcher.classList.remove('is-open');
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    syncBlocklyProgramSwitcher(doc);
    return switcher;
}

function syncBlocklyProgramRunState(doc, unit) {
    const stateEl = doc.querySelector('.host-blockly-program-state');
    if (!stateEl) return;

    const runState = unit?.runState || 'idle';
    const label = getExecutionStateShortLabel(runState);
    if (stateEl.textContent !== label) {
        stateEl.textContent = label;
    }
    stateEl.classList.remove('is-idle', 'is-compiling', 'is-downloading', 'is-running', 'is-paused');
    stateEl.classList.add(`is-${runState}`);
    stateEl.dataset.hostTooltip = `运行状态：${label}`;
    stateEl.setAttribute('aria-label', `运行状态：${label}`);
}

function syncBlocklyProgramSwitcher(doc) {
    const switcher = doc.querySelector('.host-blockly-program-switcher');
    if (!switcher) return;

    const programs = getBlocklyProgramTabs(doc);
    const activeProgram = programs.find((item) => item.isActive) || programs[0];
    const nameEl = switcher.querySelector('.host-blockly-program-name');
    const trigger = switcher.querySelector('.host-blockly-program-trigger');
    const menu = switcher.querySelector('.host-blockly-program-menu');

    if (nameEl) {
        nameEl.textContent = activeProgram?.label || '未选择';
    }
    if (trigger) {
        const label = activeProgram?.label ? `当前程序：${activeProgram.label}` : '当前程序：未选择';
        trigger.dataset.hostTooltip = '切换当前程序';
        trigger.setAttribute('aria-label', label);
    }
    if (menu) {
        menu.replaceChildren();
        programs.forEach((item) => {
            const option = doc.createElement('button');
            option.className = 'host-blockly-program-option';
            option.classList.toggle('is-active', item.isActive);
            option.type = 'button';
            option.role = 'option';
            option.setAttribute('aria-selected', String(item.isActive));
            const optionName = doc.createElement('span');
            optionName.className = 'host-blockly-program-option-name';
            optionName.textContent = item.label;
            const optionState = doc.createElement('span');
            optionState.className = 'host-blockly-program-option-state';
            optionState.textContent = item.isActive
                ? (doc.querySelector('.host-blockly-program-state')?.textContent.trim() || '未运行')
                : '未运行';
            option.append(optionName, optionState);
            option.addEventListener('click', (event) => {
                event.stopPropagation();
                switcher.classList.remove('is-open');
                trigger?.setAttribute('aria-expanded', 'false');
                item.tab.click();
                setTimeout(() => {
                    syncBlocklyProgramSwitcher(doc);
                    syncBlocklyHeaderMeta(doc);
                }, 0);
            });
            menu.appendChild(option);
        });
    }
}

function syncBlocklyHeaderMeta(doc) {
    const editGroup = doc.querySelector('[data-host-blockly-group="edit"]');
    const switcher = doc.querySelector('.host-blockly-program-switcher');
    if (!editGroup && !switcher) return;

    const switchEl = switcher?.querySelector('[role="switch"]') || editGroup?.querySelector('[role="switch"]');
    const editState = editGroup?.querySelector('.host-blockly-edit-state') || switcher?.querySelector('.host-blockly-edit-state');
    const isEditable = switchEl?.getAttribute('aria-checked') === 'true';

    syncBlocklyProgramSwitcher(doc);
    if (editState) {
        const editLabel = isEditable ? '可编辑' : '只读';
        if (editState.textContent !== editLabel) {
            editState.textContent = editLabel;
        }
        editState.classList.toggle('is-editable', isEditable);
    }
    if (switchEl) {
        const tooltipText = isEditable ? '当前程序可编辑' : '当前程序为只读，开启后可编辑并保存修改';
        switchEl.dataset.hostTooltip = tooltipText;
        switchEl.setAttribute('aria-label', isEditable ? '关闭编辑' : '开启编辑');
    }

    const undoButton = editGroup?.querySelector('#undo');
    const saveButton = editGroup?.querySelector('#save');
    const readonlyTooltip = '当前程序为只读，开启编辑后可保存修改';
    if (undoButton) {
        undoButton.removeAttribute('title');
        undoButton.dataset.hostTooltip = isEditable
            ? (undoButton.disabled ? '暂无可撤销的修改' : '撤销上一步修改')
            : readonlyTooltip;
        undoButton.setAttribute('aria-label', '撤销');
    }
    if (saveButton) {
        saveButton.removeAttribute('title');
        saveButton.dataset.hostTooltip = isEditable
            ? (saveButton.disabled ? '暂无可保存的修改' : '保存当前程序修改')
            : readonlyTooltip;
        saveButton.setAttribute('aria-label', '保存');
    }

    const viewerButton = doc.querySelector('[data-host-blockly-group="view"] #viewer');
    if (viewerButton) {
        viewerButton.removeAttribute('title');
        viewerButton.dataset.hostTooltip = '查看代码';
        viewerButton.setAttribute('aria-label', '查看代码');
    }

}

function installBlocklyRunContext(doc, api) {
    if (!doc) return;
    createEmbeddedRunControlStyles(doc);
    setupEmbeddedRunTooltip(doc);

    const runButton = findVisibleButton(doc, (button) => {
        if (button.dataset.hostRunBound) return false;
        if (button.innerText.trim() === '运行') return true;
        if (button.id === 'viewer' || button.id === 'save' || button.id === 'undo') return false;
        return Boolean(button.querySelector('.arco-icon-play-circle'));
    });
    const stopButton = findVisibleButton(doc, (button) => button.innerText.trim() === '停止');
    if (!runButton) return;

    const hostItem = runButton.closest('.arco-space-item');
    const stopItem = stopButton?.closest('.arco-space-item') || null;
    if (!hostItem) return;

    const hostSpace = hostItem.parentElement;
    if (!hostSpace) return;
    const programSwitcher = installBlocklyProgramSwitcher(doc);
    syncBlocklyProgramRunState(doc, api.getContext('blockly'));
    let menu = hostSpace?.querySelector('.host-run-target-wrap[data-host-run-control="blockly"]');
    if (!menu) {
        menu = createRunTargetMenu(doc, api, 'blockly');
        if (stopItem && stopItem.parentElement === hostSpace) {
            hostSpace.insertBefore(menu, stopItem);
        } else {
            hostItem.insertAdjacentElement('afterend', menu);
        }
    }

    const nestedGroups = [...doc.querySelectorAll('.host-run-inline-group[data-host-run-inline="blockly"] .host-run-inline-group[data-host-run-inline="blockly"]')];
    nestedGroups.forEach((group) => {
        while (group.firstChild) {
            group.parentNode.insertBefore(group.firstChild, group);
        }
        group.remove();
    });

    let inlineGroup = hostItem.closest('.host-run-inline-group[data-host-run-inline="blockly"]');
    if (!inlineGroup) {
        inlineGroup = doc.createElement('div');
        inlineGroup.className = 'host-run-inline-group';
        inlineGroup.dataset.hostRunInline = 'blockly';
        hostSpace.insertBefore(inlineGroup, hostItem);
        inlineGroup.appendChild(menu);
        inlineGroup.appendChild(hostItem);
        if (stopItem) inlineGroup.appendChild(stopItem);
    } else if (!inlineGroup.contains(hostItem)) {
        inlineGroup.appendChild(hostItem);
    }
    if (!inlineGroup.contains(menu)) {
        inlineGroup.appendChild(menu);
    }
    if (stopItem && !inlineGroup.contains(stopItem)) {
        inlineGroup.appendChild(stopItem);
    }

    let editGroup = hostSpace.querySelector('[data-host-blockly-group="edit"]');
    if (!editGroup) {
        editGroup = doc.createElement('div');
        editGroup.className = 'host-blockly-toolbar-group';
        editGroup.dataset.hostBlocklyGroup = 'edit';
        hostSpace.insertBefore(editGroup, hostSpace.firstElementChild);
    }

    let viewGroup = hostSpace.querySelector('[data-host-blockly-group="view"]');
    if (!viewGroup) {
        viewGroup = doc.createElement('div');
        viewGroup.className = 'host-blockly-toolbar-group';
        viewGroup.dataset.hostBlocklyGroup = 'view';
        hostSpace.insertBefore(viewGroup, inlineGroup);
    }

    let runGroup = hostSpace.querySelector('[data-host-blockly-group="run"]');
    if (!runGroup) {
        runGroup = doc.createElement('div');
        runGroup.className = 'host-blockly-toolbar-group';
        runGroup.dataset.hostBlocklyGroup = 'run';
        hostSpace.insertBefore(runGroup, inlineGroup);
    }

    const statusItem = hostSpace.querySelector('.arco-tag')?.closest('.arco-space-item');
    if (statusItem) {
        statusItem.classList.add('host-run-hidden');
    }
    const switchItem = hostSpace.querySelector('[role="switch"]')?.closest('.arco-space-item');
    if (switchItem && programSwitcher && !programSwitcher.contains(switchItem)) {
        let leftEdit = programSwitcher.querySelector('.host-blockly-left-edit');
        if (!leftEdit) {
            leftEdit = doc.createElement('span');
            leftEdit.className = 'host-blockly-left-edit';
            const editLabel = doc.createElement('span');
            editLabel.className = 'host-blockly-edit-toggle';
            editLabel.textContent = '编辑';
            leftEdit.appendChild(editLabel);
            programSwitcher.appendChild(leftEdit);
        }
        leftEdit.appendChild(switchItem);
        switchItem.addEventListener('click', () => {
            setTimeout(() => syncBlocklyHeaderMeta(doc), 0);
        });
    }
    const editState = editGroup.querySelector('.host-blockly-edit-state')
        || programSwitcher?.querySelector('.host-blockly-edit-state')
        || doc.createElement('span');
    editState.className = 'host-blockly-edit-state';
    if (editState.parentElement !== editGroup) {
        editGroup.insertBefore(editState, editGroup.firstElementChild);
    }
    ['undo', 'save'].forEach((id) => {
        const item = hostSpace.querySelector(`#${id}`)?.closest('.arco-space-item');
        if (item && !editGroup.contains(item)) {
            editGroup.appendChild(item);
        }
    });
    const viewerItem = hostSpace.querySelector('#viewer')?.closest('.arco-space-item');
    if (viewerItem && !viewGroup.contains(viewerItem)) {
        viewGroup.appendChild(viewerItem);
    }
    if (inlineGroup.parentElement !== runGroup) {
        runGroup.appendChild(inlineGroup);
    }
    syncBlocklyHeaderMeta(doc);
    if (hostSpace.dataset.hostBlocklyHeaderObserverBound !== 'true') {
        hostSpace.dataset.hostBlocklyHeaderObserverBound = 'true';
        const observer = new MutationObserver(() => {
            doc.defaultView?.requestAnimationFrame(() => syncBlocklyHeaderMeta(doc));
        });
        observer.observe(doc.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'aria-checked', 'disabled']
        });
    }
    if (programSwitcher && programSwitcher.dataset.hostRunStateSyncBound !== 'true') {
        programSwitcher.dataset.hostRunStateSyncBound = 'true';
        api.onChange((nextContext) => {
            syncBlocklyProgramRunState(doc, nextContext.contexts.blockly);
        });
    }

    if (runButton.dataset.hostRunBound !== 'true') {
        runButton.dataset.hostRunBound = 'true';
        runButton.addEventListener('click', () => {
            const current = api.getContext('blockly');
            if (current.runState === 'running') {
                api.markPause('blockly', `已暂停 Blockly 执行，当前目标：${summarizeExecutionTargets(current.targets)}。`);
                return;
            }
            if (current.runState === 'paused') {
                api.markResume('blockly', `已恢复 Blockly 执行，当前目标：${summarizeExecutionTargets(current.targets)}。`);
                return;
            }
            api.markRun('blockly', `已通过 Blockly 执行，当前目标：${summarizeExecutionTargets(current.targets)}。`);
        });
    }

    if (stopButton && stopButton.dataset.hostStopBound !== 'true') {
        stopButton.dataset.hostStopBound = 'true';
        stopButton.addEventListener('click', () => {
            const current = api.getContext('blockly');
            api.markStop('blockly', `已停止 Blockly 执行，当前目标：${summarizeExecutionTargets(current.targets)}。`);
        });
    }

    syncExecuteButtonState(runButton, 'blockly', api);
    if (runButton.dataset.hostRunSyncBound !== 'true') {
        runButton.dataset.hostRunSyncBound = 'true';
        api.onChange(() => {
            syncExecuteButtonState(runButton, 'blockly', api);
        });
    }
}

function installFlowPathRunContext(doc, api) {
    if (!doc) return;
    createEmbeddedRunControlStyles(doc);

    const runButton = findVisibleButton(doc, (button) => button.querySelector('.arco-icon-play-circle'));
    const stopButton = findVisibleButton(doc, (button) => {
        if (button.dataset.hostRunBound) return false;
        return button.querySelector('.arco-icon-pause-circle, .arco-icon-poweroff');
    });
    if (!runButton) return;

    const hostItem = runButton.closest('.arco-space-item');
    const stopItem = stopButton?.closest('.arco-space-item') || null;
    if (!hostItem) return;

    let menu = hostItem.parentElement?.querySelector('.host-run-target-wrap[data-host-run-control="flow"]');
    if (!menu) {
        menu = createRunTargetMenu(doc, api, 'flow');
        if (stopItem && stopItem.parentElement === hostItem.parentElement) {
            hostItem.parentElement.insertBefore(menu, stopItem);
        } else {
            hostItem.insertAdjacentElement('afterend', menu);
        }
    }

    const nestedGroups = [...doc.querySelectorAll('.host-run-inline-group[data-host-run-inline="flow"] .host-run-inline-group[data-host-run-inline="flow"]')];
    nestedGroups.forEach((group) => {
        while (group.firstChild) {
            group.parentNode.insertBefore(group.firstChild, group);
        }
        group.remove();
    });

    let inlineGroup = hostItem.closest('.host-run-inline-group[data-host-run-inline="flow"]');
    if (!inlineGroup) {
        inlineGroup = doc.createElement('div');
        inlineGroup.className = 'host-run-inline-group';
        inlineGroup.dataset.hostRunInline = 'flow';
        hostItem.parentElement.insertBefore(inlineGroup, hostItem);
        inlineGroup.appendChild(menu);
        inlineGroup.appendChild(hostItem);
        if (stopItem) inlineGroup.appendChild(stopItem);
    } else if (!inlineGroup.contains(hostItem)) {
        inlineGroup.appendChild(hostItem);
    }
    if (!inlineGroup.contains(menu)) {
        inlineGroup.appendChild(menu);
    }
    if (stopItem && !inlineGroup.contains(stopItem)) {
        inlineGroup.appendChild(stopItem);
    }
    if (stopItem) {
        stopItem.style.marginRight = '';
    }

    if (runButton.dataset.hostRunBound !== 'true') {
        runButton.dataset.hostRunBound = 'true';
        runButton.addEventListener('click', () => {
            const current = api.getContext('flow');
            if (current.runState === 'running') {
                api.markPause('flow', `已暂停流程图执行，当前目标：${summarizeExecutionTargets(current.targets)}。`);
                return;
            }
            if (current.runState === 'paused') {
                api.markResume('flow', `已恢复流程图执行，当前目标：${summarizeExecutionTargets(current.targets)}。`);
                return;
            }
            api.markRun('flow', `已通过流程图执行，当前目标：${summarizeExecutionTargets(current.targets)}。`);
        });
    }

    if (stopButton && stopButton.dataset.hostStopBound !== 'true') {
        stopButton.dataset.hostStopBound = 'true';
        stopButton.addEventListener('click', () => {
            const current = api.getContext('flow');
            api.markStop('flow', `已停止流程图执行，当前目标：${summarizeExecutionTargets(current.targets)}。`);
        });
    }

    syncExecuteButtonState(runButton, 'flow', api);
    if (runButton.dataset.hostRunSyncBound !== 'true') {
        runButton.dataset.hostRunSyncBound = 'true';
        api.onChange(() => {
            syncExecuteButtonState(runButton, 'flow', api);
        });
    }
}

function bindActionEditorRunControls(api) {
    const actionFrame = document.getElementById('action-editor-frame');
    if (!actionFrame) return;

    const install = () => {
        try {
            const actionDoc = actionFrame.contentDocument;
            if (!actionDoc?.body) return;

            installBlocklyRunContext(actionDoc, api);

            const flowFrame = [...actionDoc.querySelectorAll('iframe')].find((frame) => {
                try {
                    return frame.contentWindow?.location?.href?.includes('/flow-path/');
                } catch (error) {
                    return false;
                }
            });

            if (!flowFrame?.contentDocument?.body) return;
            installFlowPathRunContext(flowFrame.contentDocument, api);
        } catch (error) {
            console.warn('绑定动作编辑执行增强失败。', error);
        }
    };

    if (actionFrame.__hostRunInterval) {
        window.clearInterval(actionFrame.__hostRunInterval);
    }

    actionFrame.addEventListener('load', () => {
        window.setTimeout(install, 180);
        window.setTimeout(install, 520);
    });

    install();
    window.setTimeout(install, 180);
    window.setTimeout(install, 520);
    actionFrame.__hostRunInterval = window.setInterval(install, 900);
}

// 更新窗口控制按钮
function updateWindowControlButton(windowElement) {
    const toggleBtn = windowElement.querySelector('.toggle-btn');
    const swapDropdown = windowElement.querySelector('.window-swap-dropdown');
    const icon = toggleBtn.querySelector('i');
    
    const state = layoutManager ? layoutManager.getState() : { fullscreenWindow: null, isInLayoutMode: false };
    
    if (state.fullscreenWindow === windowElement) {
        // 当前窗口全屏时只显示最小化按钮
        icon.className = 'bi bi-caret-down-square';
        toggleBtn.title = '最小化窗口';
        // 全屏时隐藏交换按钮
        swapDropdown.style.display = 'none';
    } else {
        // 非全屏窗口显示全屏按钮
        icon.className = 'bi bi-arrows-fullscreen';
        toggleBtn.title = '全屏显示';
        // 布局模式下显示交换按钮
        if (state.isInLayoutMode) {
            swapDropdown.style.display = 'inline-block';
        } else {
            swapDropdown.style.display = 'none';
        }
    }
}

// 全屏显示窗口（通过布局管理器）
function enterFullscreen(windowElement) {
    if (layoutManager) {
        // 这个函数主要被布局中的窗口控制按钮调用，所以标记为从布局来的
        layoutManager.enterFullscreen(windowElement, 'layout');
    }
}

// 返回布局模式（已由布局管理器处理，保留此函数以防其他地方调用）
function exitFullscreen() {
    // 此功能现在由布局管理器的 minimizeWindow 方法处理
    console.log('exitFullscreen已废弃，请使用布局管理器的minimizeWindow方法');
}

// 更新状态栏窗口管理按钮状态
function updateStatusBarWindowStates() {
    const windowItems = document.querySelectorAll('.window-item');
    const state = layoutManager ? layoutManager.getState() : { fullscreenWindow: null };
    
    windowItems.forEach(item => {
        const windowType = item.textContent.trim();
        const targetWindow = layoutManager ? layoutManager.getWindowByType(windowType) : null;
        
        if (targetWindow) {
            if (state.fullscreenWindow === targetWindow) {
                // 当前窗口全屏，标记为激活状态
                item.classList.add('active');
            } else {
                // 其他窗口都标记为未激活状态
                item.classList.remove('active');
            }
        }
    });
}

// 初始化窗口状态
function initializeWindowStates() {
    // 隐藏所有窗口
    const allWindows = document.querySelectorAll('.window');
    allWindows.forEach(window => {
        window.style.display = 'none';
    });
    
    // 隐藏布局选择器，使用布局管理器创建默认布局
    const layoutSelector = document.querySelector('.layout-selector');
    layoutSelector.style.display = 'none';
    
    // 初始化布局管理器并创建默认布局
    if (layoutManager) {
        layoutManager.initialize();
    }
    
    // 重置全屏窗口状态
    fullscreenWindow = null;
}

// 工具栏按钮切换逻辑
function setupToolbarControls() {
    const leftToolbarBtns = document.querySelectorAll('.left-toolbar-btn');

    leftToolbarBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const toolType = this.getAttribute('data-tool');
            const isThisActive = this.classList.contains('active');

            // 先关闭所有其他面板（tools、devices、bind 互斥）
            const subToolbar = document.getElementById('sub-toolbar');

            leftToolbarBtns.forEach(otherBtn => {
                const otherTool = otherBtn.getAttribute('data-tool');
                if (otherBtn !== this) {
                    otherBtn.classList.remove('active');
                    if (otherTool === 'tools' && subToolbar) {
                        subToolbar.classList.remove('show');
                    }
                }
            });

            // 关闭设备库面板
            if (toolType !== 'devices') {
                const devicePanel = window.getDeviceLibraryPanel?.();
                if (devicePanel) devicePanel.hide();
            }

            // 关闭绑定面板
            if (toolType !== 'bind') {
                const bindingPanel = window.getBindingPanel?.();
                if (bindingPanel) bindingPanel.hide();
            }

            // 然后处理当前按钮的行为
            if (toolType === 'tools') {
                // 工具按钮：切换激活状态和子工具栏显示
                this.classList.toggle('active');
                if (subToolbar) {
                    subToolbar.classList.toggle('show');
                }
                if (this.classList.contains('active')) {
                    // 联动激活右侧属性面板的结构tab
                    activateStructureTab();
                }
            } else if (toolType === 'devices') {
                // 设备库按钮：切换设备库面板显示/隐藏
                const devicePanel = window.getDeviceLibraryPanel?.();
                if (devicePanel) {
                    devicePanel.toggle();
                    this.classList.toggle('active');
                }
            } else if (toolType === 'bind') {
                // 绑定按钮：打开拓扑模型到 3D 模型的绑定弹窗
                const bindingPanel = window.getBindingPanel?.();
                if (bindingPanel) {
                    bindingPanel.toggle();
                    this.classList.toggle('active');
                }
            } else {
                // 其他按钮：触发窗口打开逻辑（预留）
                console.log(`打开${this.getAttribute('title')}窗口`);
            }
        });
    });
}

// 检测画布空间并切换响应式模式
function setupToolbarResponsive() {
    const centerContent = document.querySelector('.center-content');
    if (!centerContent) return;

    // 子工具栏宽度约595px，需要足够空间居中显示
    // 使用650px作为阈值（工具栏宽度+边距）
    const MIN_WIDTH_FOR_CENTERED = 650;

    function checkSpace() {
        const containerWidth = centerContent.offsetWidth;
        const subToolbar = document.getElementById('sub-toolbar');
        const toolbarWidth = subToolbar ? subToolbar.offsetWidth : 595;

        // 判断是否有足够空间居中显示
        // 需要：容器宽度 >= 工具栏宽度 + 左侧工具栏宽度(60px) + 边距(50px)
        const hasEnoughSpace = containerWidth >= (toolbarWidth + 110);

        if (hasEnoughSpace) {
            centerContent.classList.remove('space-constrained');
        } else {
            centerContent.classList.add('space-constrained');
        }
    }

    // 初始检查
    checkSpace();

    // 使用ResizeObserver监听容器大小变化
    if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
            checkSpace();
        });
        resizeObserver.observe(centerContent);

        // 保存observer引用以便后续清理
        window.toolbarResizeObserver = resizeObserver;
    } else {
        // 降级方案：监听窗口resize事件
        window.addEventListener('resize', checkSpace);
    }
}

// 设置3D视口机械臂属性浮层
function setupArmPropertyPanel() {
    const sourcePanel = document.getElementById('armPropertyPanel');
    if (!sourcePanel) return;

    const viewport = sourcePanel.closest('.center-content');
    const panels = createArmPropertyPanelVariants(sourcePanel);
    const openBtns = document.querySelectorAll('[data-arm-panel-toggle]');
    const panelStates = new Map();
    const userClosedPanels = new Set(); // 追踪用户手动关闭的面板
    let activeDragState = null;
    let isAnyPanelDragging = false; // 是否有面板正在被拖动

    function clampPanelPosition(panel, left, top) {
        const panelRect = panel.getBoundingClientRect();
        const padding = 12;
        const maxLeft = Math.max(padding, window.innerWidth - panelRect.width - padding);
        const maxTop = Math.max(padding, window.innerHeight - 56);

        return {
            left: Math.max(padding, Math.min(left, maxLeft)),
            top: Math.max(padding, Math.min(top, maxTop))
        };
    }

    function setPanelPosition(panel, left, top) {
        const nextPosition = clampPanelPosition(panel, left, top);
        panel.style.left = `${nextPosition.left}px`;
        panel.style.top = `${nextPosition.top}px`;
        panel.style.right = 'auto';
    }

    function setInitialPanelPositions() {
        if (!viewport) return;
        // 如果有面板正在被拖动，跳过位置设置
        if (isAnyPanelDragging) return;

        const viewportRect = viewport.getBoundingClientRect();
        const visiblePanels = panels.filter(panel => !panel.classList.contains('hidden'));
        const padding = 12;
        const gap = 12;
        const availableLeft = Math.max(padding, viewportRect.left + padding);
        const anchorRight = Math.min(viewportRect.right - padding, window.innerWidth - padding);
        const totalPanelWidth = visiblePanels.reduce((sum, panel) => sum + panel.getBoundingClientRect().width, 0);
        const totalWidth = totalPanelWidth + Math.max(0, visiblePanels.length - 1) * gap;
        const canPlaceSideBySide = anchorRight - totalWidth >= availableLeft;
        let nextLeft = anchorRight - totalWidth;

        visiblePanels.forEach((panel, index) => {
            const state = panelStates.get(panel);
            // 只有在面板没有自定义位置、不在拖动中、且没有在拖动后被放下时才设置初始位置
            if (state?.hasCustomPosition) return;
            if (activeDragState && activeDragState.panel === panel) return;

            const panelRect = panel.getBoundingClientRect();
            const sideBySideLeft = nextLeft;
            const cascadeLeft = index % 2 === 0
                ? Math.max(padding, anchorRight - panelRect.width - Math.floor(index / 2) * 24)
                : padding + Math.floor(index / 2) * 24;
            const nextTop = viewportRect.top + 60 + (canPlaceSideBySide ? 0 : index * 34);

            setPanelPosition(
                panel,
                Math.max(padding, canPlaceSideBySide ? sideBySideLeft : cascadeLeft),
                Math.max(padding, nextTop)
            );
            panel.style.zIndex = String(1200 + index);
            nextLeft += panelRect.width + gap;
        });
    }

    // 检查仿真窗口是否处于全屏状态
    function isSimulationFullscreen() {
        if (!layoutManager) return false;
        const state = layoutManager.getState();
        return state.fullscreenWindow?.classList.contains('simulation-window');
    }

    // 根据全屏状态更新面板可见性
    function updatePanelVisibility() {
        if (isSimulationFullscreen()) {
            panels.forEach(panel => {
                // 如果用户手动关闭了面板，不再自动显示
                if (userClosedPanels.has(panel)) return;
                panel.classList.remove('hidden');
            });
            window.requestAnimationFrame(setInitialPanelPositions);
        } else {
            panels.forEach(panel => panel.classList.add('hidden'));
        }
    }

    function showPanels() {
        // 只有在全屏状态下才允许显示面板
        if (!isSimulationFullscreen()) return;
        // 用户手动点击打开按钮时，清除关闭状态并显示所有面板
        userClosedPanels.clear();
        panels.forEach(panel => panel.classList.remove('hidden'));
        window.requestAnimationFrame(setInitialPanelPositions);
    }

    panels.forEach(panel => {
        const header = panel.querySelector('.arm-panel-header');
        const closeBtn = panel.querySelector('.arm-panel-close');
        const jointRows = panel.querySelectorAll('.arm-joint-row');
        panelStates.set(panel, { hasCustomPosition: false });

        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.add('hidden');
            userClosedPanels.add(panel); // 标记用户手动关闭的面板
        });

        header?.addEventListener('mousedown', (e) => {
            if (e.target.closest('.arm-panel-close')) return;

            const panelRect = panel.getBoundingClientRect();
            const state = panelStates.get(panel);
            state.hasCustomPosition = true;
            activeDragState = {
                panel,
                offsetX: e.clientX - panelRect.left,
                offsetY: e.clientY - panelRect.top
            };
            isAnyPanelDragging = true; // 标记有面板正在被拖动

            // 关键修复：将所有面板标记为已自定义位置，防止拖动期间被 setInitialPanelPositions 重置
            panels.forEach(p => {
                const s = panelStates.get(p);
                if (s) s.hasCustomPosition = true;
            });

            panel.classList.add('dragging');
            panel.style.left = `${panelRect.left}px`;
            panel.style.top = `${panelRect.top}px`;
            panel.style.right = 'auto';
            e.preventDefault();
        });

        jointRows.forEach(row => {
            const range = row.querySelector('input[type="range"]');
            const valueInput = row.querySelector('input[type="number"]');
            if (!range || !valueInput) return;

            range.addEventListener('input', () => {
                valueInput.value = Number(range.value).toFixed(3);
            });

            valueInput.addEventListener('input', () => {
                range.value = valueInput.value;
            });
        });
    });

    openBtns.forEach(btn => {
        btn.addEventListener('click', showPanels);
    });

    document.addEventListener('mousemove', (e) => {
        if (!activeDragState) return;

        setPanelPosition(
            activeDragState.panel,
            e.clientX - activeDragState.offsetX,
            e.clientY - activeDragState.offsetY
        );
    });

    document.addEventListener('mouseup', () => {
        if (!activeDragState) return;
        activeDragState.panel.classList.remove('dragging');
        activeDragState = null;
        isAnyPanelDragging = false; // 清除拖动状态
    });

    // 监听窗口大小变化，检测全屏状态变化
    if (typeof ResizeObserver !== 'undefined' && viewport) {
        const observer = new ResizeObserver(() => {
            setInitialPanelPositions();
            updatePanelVisibility();
        });
        observer.observe(viewport);
        window.armPropertyPanelResizeObserver = observer;
    }

    // 监听布局管理器状态变化（通过定时检查）
    const stateCheckInterval = setInterval(() => {
        updatePanelVisibility();
    }, 500);

    // 初始检查（延迟执行确保布局管理器已初始化）
    setTimeout(updatePanelVisibility, 100);
}

function createArmPropertyPanelVariants(sourcePanel) {
    if (document.getElementById('armPropertyPanelReadout')) {
        return Array.from(document.querySelectorAll('.arm-property-panel'));
    }

    const variants = [
        {
            id: 'armPropertyPanelReadout',
            className: 'arm-panel-variant-readout',
            label: '空间坐标舱',
            status: ['姿态', 'XYZ']
        },
        {
            id: 'armPropertyPanelCompact',
            className: 'arm-panel-variant-compact',
            label: '手柄控制器',
            status: ['手动', 'PAD']
        }
    ];

    let insertAfter = sourcePanel;
    const createdPanels = variants.map(variant => {
        const panel = sourcePanel.cloneNode(true);
        panel.id = variant.id;
        panel.dataset.armPanelVariant = variant.className.replace('arm-panel-variant-', '');
        panel.classList.remove('arm-panel-variant-flow');
        panel.classList.add(variant.className);
        panel.setAttribute('aria-label', `机械臂属性面板 ${variant.label}`);
        panel.querySelector('.arm-panel-title').textContent = 'Z-Arm S622_1 - 属性面板';
        panel.querySelector('.arm-panel-status span:first-child').textContent = variant.status[0];
        panel.querySelector('.arm-panel-status span:last-child').textContent = variant.status[1];
        insertAfter.insertAdjacentElement('afterend', panel);
        insertAfter = panel;
        return panel;
    });

    return [sourcePanel, ...createdPanels];
}

// 设置窗口控制功能
function setupWindowControls() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const windowItems = document.querySelectorAll('.window-item');
    
    // 窗口控制按钮（最小化/全屏）
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const windowElement = this.closest('.window');
            
            if (layoutManager) {
                layoutManager.handleWindowControlClick(windowElement);
            }
        });
    });
    
    // 状态栏窗口管理按钮
    windowItems.forEach(item => {
        item.addEventListener('click', function() {
            const windowType = this.textContent.trim();
            
            if (layoutManager) {
                layoutManager.handleWindowItemClick(windowType);
            }
        });
    });
}

// 最小化窗口（通过布局管理器）
function minimizeWindow(windowElement) {
    if (layoutManager) {
        layoutManager.minimizeWindow(windowElement);
    }
}

// 显示窗口
function showWindow(windowElement) {
    windowElement.style.display = 'flex';
    windowElement.classList.remove('minimized');
}

// 更新窗口管理按钮状态
function updateWindowItemState(windowItem, isActive) {
    if (isActive) {
        windowItem.classList.add('active');
    } else {
        windowItem.classList.remove('active');
    }
}



// 设置补充行为控制面板展开/收起功能
function setupTimelineToggle() {
    const timelinePanel = document.querySelector('.timeline-panel');
    const timelineToggle = document.querySelector('.timeline-toggle');
    
    if (timelinePanel && timelineToggle) {
        // 点击整个标题栏都可以切换
        const timelineHeader = timelinePanel.querySelector('.timeline-header');
        if (timelineHeader) {
            timelineHeader.addEventListener('click', function(e) {
                toggleTimelinePanel();
            });
        }
    }
    
    function toggleTimelinePanel() {
        const isExpanded = timelinePanel.classList.contains('expanded');
        const icon = timelineToggle.querySelector('i');
        
        if (isExpanded) {
            // 当前展开，点击收起
            timelinePanel.classList.remove('expanded');
            icon.className = 'bi bi-caret-up-fill';
        } else {
            // 当前收起，点击展开
            timelinePanel.classList.add('expanded');
            icon.className = 'bi bi-caret-down-fill';
        }
    }
}



// 设置窗口位置交换控件
function setupWindowSwapControls() {
    // 添加必要的CSS样式
    addSwapControlsStyles();
    
    // 设置交换按钮事件
    const swapBtns = document.querySelectorAll('.swap-btn');
    const swapDropdowns = document.querySelectorAll('.window-swap-dropdown');
    
    swapBtns.forEach(btn => {
        const dropdown = btn.closest('.window-swap-dropdown');
        const menu = dropdown.querySelector('.swap-dropdown-menu');
        
        // 鼠标悬停显示菜单
        dropdown.addEventListener('mouseenter', function() {
            const state = layoutManager ? layoutManager.getState() : { isInLayoutMode: false, fullscreenWindow: null };
            if (state.isInLayoutMode && !state.fullscreenWindow) {
                updateSwapDropdownMenu(this);
                menu.style.display = 'block';
            }
        });
        
        // 鼠标离开隐藏菜单
        dropdown.addEventListener('mouseleave', function() {
            menu.style.display = 'none';
        });
    });
}

// 添加交换控件的CSS样式
function addSwapControlsStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .window-swap-dropdown {
            position: relative;
            display: inline-block;
        }
        
        .swap-dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            min-width: 120px;
            background: #2b2b2b;
            border: 0;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            display: none;
            padding: 4px 0;
        }
        
        .swap-dropdown-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            cursor: pointer;
            color: #ffffff;
            font-size: 12px;
            transition: background-color 0.2s;
        }
        
        .swap-dropdown-item:hover {
            background-color: #404040;
        }
        
        .swap-dropdown-item i {
            font-size: 14px;
            width: 14px;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
}

// 更新交换下拉菜单内容
function updateSwapDropdownMenu(swapDropdown) {
    if (!layoutManager) return;
    
    const currentWindow = swapDropdown.closest('.window');
    const currentWindowId = currentWindow.getAttribute('data-window');
    const menu = swapDropdown.querySelector('.swap-dropdown-menu');
    
    // 获取其他窗口选项
    const otherWindows = layoutManager.getOtherWindows(currentWindowId);
    if (otherWindows.length === 0) return;
    
    // 清空并重新生成菜单项
    menu.innerHTML = '';
    
    const state = layoutManager.getState();
    const isDualLayout = state.currentLayoutType && state.currentLayoutType.startsWith('dual-');
    
    otherWindows.forEach(({ id, name, icon, index, isInLayout }) => {
        const item = document.createElement('div');
        item.className = 'swap-dropdown-item';
        
        item.innerHTML = `
            <i class="${icon}"></i>
            <span>${name}</span>
        `;
        
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const currentIndex = layoutManager.getWindowIndex(currentWindowId);
            if (currentIndex !== -1) {
                if (isDualLayout && !isInLayout) {
                    // 双窗口布局中，用隐藏窗口替换当前窗口
                    layoutManager.swapWindowPositions(currentIndex, -1, id);
                } else {
                    // 交换布局中的两个窗口
                    layoutManager.swapWindowPositions(currentIndex, index);
                }
            }
            menu.style.display = 'none';
        });
        
        menu.appendChild(item);
    });
}



// 更新窗口控制按钮状态
function updateAllWindowControls() {
    const allWindows = document.querySelectorAll('.window');
    
    allWindows.forEach(window => {
        const swapDropdown = window.querySelector('.window-swap-dropdown');
        const toggleBtn = window.querySelector('.toggle-btn');
        
        const state = layoutManager ? layoutManager.getState() : { isInLayoutMode: false, fullscreenWindow: null };
        if (state.isInLayoutMode && !state.fullscreenWindow) {
            // 布局模式下显示交换按钮
            swapDropdown.style.display = 'inline-block';
        } else {
            // 非布局模式或全屏模式下隐藏交换按钮
            swapDropdown.style.display = 'none';
        }
        
        // 更新toggle按钮
        updateWindowControlButton(window);
    });
}

// 设置属性面板Tab功能
function setupPanelTabs() {
    const panelTabs = document.querySelectorAll('.panel-tab');
    const tabContents = document.querySelectorAll('.panel-tab-content');
    const panelContentWrapper = document.querySelector('.panel-content-wrapper');
    const rightPanel = document.querySelector('.right-panel');
    
    // 如果面板内容还未加载，则延迟执行
    if (!panelContentWrapper || !rightPanel) {
        setTimeout(() => setupPanelTabs(), 500);
        return;
    }
    
    panelTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            const targetContent = document.querySelector(`[data-content="${tabId}"]`);
            
            if (!targetContent) return;
            
            // 如果点击的是当前激活的tab，则关闭所有tab
            if (activePanelTab === tabId) {
                // 关闭当前tab
                this.classList.remove('active');
                targetContent.classList.remove('active');
                if (panelContentWrapper) {
                    panelContentWrapper.style.display = 'none';
                }
                if (rightPanel) {
                    rightPanel.classList.remove('tabs-open');
                    rightPanel.classList.add('tabs-closed');
                }
                activePanelTab = null;
            } else {
                // 先关闭所有tab
                panelTabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // 激活选中的tab
                this.classList.add('active');
                targetContent.classList.add('active');
                if (panelContentWrapper) {
                    panelContentWrapper.style.display = 'flex';
                }
                if (rightPanel) {
                    rightPanel.classList.remove('tabs-closed');
                    rightPanel.classList.add('tabs-open');
                }
                activePanelTab = tabId;
            }
        });
    });
    
    // 初始化：所有tab都关闭，只显示tab栏
    if (panelContentWrapper) {
        panelContentWrapper.style.display = 'none';
    }
    if (rightPanel) {
        rightPanel.classList.add('tabs-closed');
    }
}

// 激活结构tab的辅助函数
function activateStructureTab() {
    const structureTab = document.querySelector('[data-tab="structure"]');
    const structureContent = document.querySelector('[data-content="structure"]');
    const panelTabs = document.querySelectorAll('.panel-tab');
    const tabContents = document.querySelectorAll('.panel-tab-content');
    const panelContentWrapper = document.querySelector('.panel-content-wrapper');
    const rightPanel = document.querySelector('.right-panel');
    
    if (!structureTab || !structureContent || !panelContentWrapper || !rightPanel) return;
    
    // 先关闭所有tab
    panelTabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // 激活结构tab
    structureTab.classList.add('active');
    structureContent.classList.add('active');
    panelContentWrapper.style.display = 'flex';
    rightPanel.classList.remove('tabs-closed');
    rightPanel.classList.add('tabs-open');
    
    // 更新全局状态变量
    activePanelTab = 'structure';
}

// 设置项目下拉菜单功能
function setupProjectDropdown() {
    const projectDropdown = document.querySelector('.project-dropdown');
    const projectDropdownBtn = document.querySelector('.project-dropdown-btn');
    const projectDropdownMenu = document.querySelector('.project-dropdown-menu');
    let projectItemMenu = document.querySelector('.project-item-menu');
    
    if (!projectDropdown || !projectDropdownMenu) {
        return;
    }

    if (projectDropdown.dataset.dropdownBound === 'true') {
        return;
    }

    projectDropdown.dataset.dropdownBound = 'true';
    if (projectDropdownMenu.parentElement !== document.body) {
        document.body.appendChild(projectDropdownMenu);
    }
    if (!projectItemMenu) {
        projectItemMenu = document.createElement('div');
        projectItemMenu.className = 'project-item-menu';
        projectItemMenu.innerHTML = [
            '<button class="project-item-menu-item" type="button" data-action="open">打开</button>',
            '<button class="project-item-menu-item" type="button" data-action="edit">编辑</button>',
            '<button class="project-item-menu-item" type="button" data-action="export">导出</button>',
            '<button class="project-item-menu-item" type="button" data-action="remove">删除</button>'
        ].join('');
        document.body.appendChild(projectItemMenu);
    }

    let activeMoreButton = null;

    const syncMenuPosition = () => {
        if (!projectDropdown || !projectDropdownMenu) {
            return;
        }
        const rect = projectDropdown.getBoundingClientRect();
        projectDropdownMenu.style.position = 'fixed';
        projectDropdownMenu.style.left = `${Math.round(rect.left + 5)}px`;
        projectDropdownMenu.style.top = `${Math.round(rect.bottom + 5)}px`;
    };

    const setOpen = (open) => {
        projectDropdown.classList.toggle('open', open);
        projectDropdownMenu.classList.toggle('open', open);
        if (projectDropdownBtn) {
            projectDropdownBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        if (open) {
            syncMenuPosition();
        } else if (activeMoreButton) {
            activeMoreButton.setAttribute('aria-expanded', 'false');
            activeMoreButton = null;
            projectItemMenu.classList.remove('open');
        }
    };

    const closeItemMenu = () => {
        if (activeMoreButton) {
            activeMoreButton.setAttribute('aria-expanded', 'false');
            activeMoreButton = null;
        }
        projectItemMenu.classList.remove('open');
    };

    const openItemMenu = (button) => {
        const rect = button.getBoundingClientRect();
        closeItemMenu();
        activeMoreButton = button;
        activeMoreButton.setAttribute('aria-expanded', 'true');
        projectItemMenu.style.left = `${Math.round(rect.right + 6)}px`;
        projectItemMenu.style.top = `${Math.round(rect.top - 4)}px`;
        projectItemMenu.classList.add('open');
    };

    if (projectDropdownBtn) {
        projectDropdownBtn.setAttribute('aria-haspopup', 'menu');
        projectDropdownBtn.setAttribute('aria-expanded', 'false');
        projectDropdownBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(!projectDropdown.classList.contains('open'));
        });
        projectDropdownBtn.addEventListener('focus', function() {
            syncMenuPosition();
        });
    }

    document.addEventListener('click', function(event) {
        if (!projectDropdown.contains(event.target) && !projectDropdownMenu.contains(event.target) && !projectItemMenu.contains(event.target)) {
            setOpen(false);
            closeItemMenu();
        }
    });

    projectDropdownMenu.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    projectDropdownMenu.querySelectorAll('.project-dropdown-item-more').forEach((button) => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            if (button === activeMoreButton && projectItemMenu.classList.contains('open')) {
                closeItemMenu();
                return;
            }
            openItemMenu(button);
        });
    });

    projectItemMenu.addEventListener('click', function(event) {
        const item = event.target.closest('.project-item-menu-item');
        if (!item) {
            return;
        }
        event.stopPropagation();
        closeItemMenu();
    });

    window.addEventListener('resize', function() {
        if (projectDropdown.classList.contains('open')) {
            syncMenuPosition();
        }
        closeItemMenu();
    });

    window.addEventListener('scroll', function() {
        if (projectDropdown.classList.contains('open')) {
            syncMenuPosition();
        }
        closeItemMenu();
    }, true);
}

function setupTopMenuInteractions() {
    const topMenu = document.querySelector('.top-menu-bar');
    const tooltipLayer = document.createElement('div');

    if (!topMenu || topMenu.dataset.topMenuBound === 'true') {
        return;
    }

    topMenu.dataset.topMenuBound = 'true';
    tooltipLayer.className = 'top-menu-tooltip-layer';
    document.body.appendChild(tooltipLayer);

    const showTooltip = (target) => {
        if (!target.dataset.tooltip) {
            return;
        }
        hideTooltip();
        target.dataset.tooltipVisible = 'true';

        const rect = target.getBoundingClientRect();
        tooltipLayer.textContent = target.dataset.tooltip;
        tooltipLayer.classList.add('visible');

        const layerRect = tooltipLayer.getBoundingClientRect();
        const left = rect.left + (rect.width / 2) - (layerRect.width / 2);
        const top = rect.bottom + 10;

        tooltipLayer.style.left = `${Math.max(8, Math.min(left, window.innerWidth - layerRect.width - 8))}px`;
        tooltipLayer.style.top = `${top}px`;
    };

    const hideTooltip = () => {
        topMenu.querySelectorAll('[data-tooltip-visible="true"]').forEach((target) => {
            delete target.dataset.tooltipVisible;
        });
        tooltipLayer.classList.remove('visible');
    };

    topMenu.addEventListener('mouseover', (event) => {
        const target = event.target.closest('[data-tooltip]');
        if (!target || !topMenu.contains(target)) {
            return;
        }
        showTooltip(target);
    });

    topMenu.addEventListener('mouseout', (event) => {
        const target = event.target.closest('[data-tooltip]');
        if (!target || !topMenu.contains(target)) {
            return;
        }
        const nextTarget = event.relatedTarget instanceof Element ? event.relatedTarget.closest('[data-tooltip]') : null;
        if (nextTarget === target) {
            return;
        }
        hideTooltip();
    });

    topMenu.querySelectorAll('[data-tooltip]').forEach((target) => {
        target.addEventListener('mouseenter', () => showTooltip(target));
        target.addEventListener('mouseleave', hideTooltip);
        target.addEventListener('focus', () => showTooltip(target));
        target.addEventListener('blur', hideTooltip);
    });

    const closeAllDropdowns = () => {
        topMenu.querySelectorAll('.top-menu-dropdown.open').forEach((dropdown) => {
            dropdown.classList.remove('open');
            const trigger = dropdown.querySelector('[aria-expanded="true"]');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    };

    topMenu.querySelectorAll('.top-menu-dropdown').forEach((dropdown) => {
        const currentUserInline = dropdown.querySelector('.current-user-inline');
        const userBtn = dropdown.querySelector('.current-user-btn');
        const chevronBtn = dropdown.querySelector('.current-user-chevron');
        const directBtn = dropdown.querySelector('.download-menu-btn');

        const toggleDropdown = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const willOpen = !dropdown.classList.contains('open');
            closeAllDropdowns();

            if (willOpen) {
                dropdown.classList.add('open');
                if (userBtn) {
                    userBtn.setAttribute('aria-expanded', 'true');
                }
                if (directBtn) {
                    directBtn.setAttribute('aria-expanded', 'true');
                }
            }
        };

        if (currentUserInline) {
            currentUserInline.addEventListener('click', toggleDropdown);
        }

        if (userBtn) {
            userBtn.addEventListener('click', toggleDropdown);
        }

        if (chevronBtn) {
            chevronBtn.addEventListener('click', toggleDropdown);
        }

        if (directBtn) {
            directBtn.addEventListener('click', toggleDropdown);
        }
    });

    document.addEventListener('click', (event) => {
        if (!topMenu.contains(event.target)) {
            closeAllDropdowns();
            hideTooltip();
        }
    });

    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);
}
