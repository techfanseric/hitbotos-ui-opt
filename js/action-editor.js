(function() {
    function defineBlocklyBlocks(Blockly) {
        if (!Blockly || Blockly.HitbotActionEditorBlocksDefined) return;
        Blockly.HitbotActionEditorBlocksDefined = true;

        const valueOptions = [
            ['X坐标', 'X坐标'],
            ['Y坐标', 'Y坐标'],
            ['Z坐标', 'Z坐标'],
            ['速度', '速度'],
            ['加速度', '加速度'],
            ['减速度', '减速度'],
            ['超时时间', '超时时间']
        ];

        const assignOptions = [
            ['夹爪关闭位置', '夹爪关闭位置'],
            ['夹爪打开位置', '夹爪打开位置'],
            ['减速度', '减速度'],
            ['加速度', '加速度'],
            ['速度', '速度']
        ];

        function appendValueLine(block, label, fieldName) {
            block.appendDummyInput()
                .appendField(label)
                .appendField(new Blockly.FieldDropdown(valueOptions), fieldName);
        }

        Blockly.Blocks.hitbot_poll_start = {
            init: function() {
                this.appendDummyInput().appendField('开始轮询指令消息');
                this.appendDummyInput().appendField('main');
                this.setColour('#5ba5a5');
                this.setMovable(false);
                this.setDeletable(false);
                this.setEditable(false);
            }
        };

        function initMoveBlock(block, axisLabel, fnName) {
            block.appendDummyInput()
                .appendField('定义函数')
                .appendField(fnName);
            block.appendDummyInput().appendField('参数');
            appendValueLine(block, axisLabel, 'AXIS');
            appendValueLine(block, '速度', 'SPEED');
            appendValueLine(block, '加速度', 'ACC');
            appendValueLine(block, '减速度', 'DEC');
            appendValueLine(block, '超时时间', 'TIMEOUT');
            block.appendDummyInput()
                .appendField('电缸')
                .appendField('移动')
                .appendField('坐标')
                .appendField('速度')
                .appendField('加速度')
                .appendField('减速度');
            block.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([['绝对位置', '绝对位置']]), 'MODE')
                .appendField('超时时间');
            block.setColour('#5b5e66');
            block.setMovable(false);
            block.setDeletable(false);
            block.setFieldValue(axisLabel, 'AXIS');
            block.setFieldValue('速度', 'SPEED');
            block.setFieldValue('加速度', 'ACC');
            block.setFieldValue('减速度', 'DEC');
            block.setFieldValue('超时时间', 'TIMEOUT');
            block.setFieldValue('绝对位置', 'MODE');
        }

        Blockly.Blocks.hitbot_define_move_x = {
            init: function() {
                initMoveBlock(this, 'X坐标', 'move_x');
            }
        };

        Blockly.Blocks.hitbot_define_move_y = {
            init: function() {
                initMoveBlock(this, 'Y坐标', 'move_y');
            }
        };

        Blockly.Blocks.hitbot_define_move_z = {
            init: function() {
                initMoveBlock(this, 'Z坐标', 'move_z');
            }
        };

        Blockly.Blocks.hitbot_assign_value = {
            init: function() {
                this.appendDummyInput()
                    .appendField('赋值')
                    .appendField(new Blockly.FieldDropdown(assignOptions), 'LABEL')
                    .appendField('为');
                this.setColour('#a5805b');
                this.setMovable(false);
                this.setDeletable(false);
            }
        };

        Blockly.Blocks.hitbot_gripper_config = {
            init: function() {
                this.appendDummyInput()
                    .appendField('夹爪')
                    .appendField('设置')
                    .appendField('夹持距离');
                this.setColour('#5b84c6');
                this.setMovable(false);
                this.setDeletable(false);
            }
        };

        Blockly.Blocks.hitbot_define_message = {
            init: function() {
                this.appendDummyInput()
                    .appendField('定义指令消息')
                    .appendField('transport_reagent');
                this.setColour('#8c63d4');
                this.setMovable(false);
                this.setDeletable(false);
            }
        };

        Blockly.Blocks.hitbot_parallel_run = {
            init: function() {
                this.appendDummyInput().appendField('并行运行');
                this.setColour('#5ba5a5');
                this.setMovable(false);
                this.setDeletable(false);
            }
        };
    }

    function createBlocklyTheme(Blockly) {
        if (!Blockly || !Blockly.Theme) return null;
        return Blockly.Theme.defineTheme('hitbotActionEditorTheme', {
            base: Blockly.Themes.Classic,
            componentStyles: {
                workspaceBackgroundColour: '#1e1e1e',
                toolboxBackgroundColour: '#1e1e1e',
                toolboxForegroundColour: '#ffffff',
                flyoutBackgroundColour: '#232324',
                flyoutForegroundColour: '#ffffff',
                flyoutOpacity: 1,
                scrollbarColour: 'rgba(255,255,255,0.22)',
                scrollbarOpacity: 1,
                insertionMarkerColour: '#ffffff',
                insertionMarkerOpacity: 0.3,
                markerColour: '#ffffff',
                cursorColour: '#ffffff'
            },
            fontStyle: {
                family: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                weight: '500',
                size: 13
            }
        });
    }

    function initBlockly(doc, root) {
        const host = doc.getElementById('blockly-workspace');
        const Blockly = doc.defaultView?.Blockly;
        if (!host || !Blockly || host.dataset.initialized === 'true') return null;

        defineBlocklyBlocks(Blockly);
        const theme = createBlocklyTheme(Blockly);
        const workspace = Blockly.inject(host, {
            comments: false,
            collapse: false,
            disable: false,
            grid: {
                spacing: 17.5,
                length: 2.1,
                colour: '#888888',
                snap: false
            },
            media: 'https://unpkg.com/blockly/media/',
            move: {
                drag: false,
                scrollbars: {
                    horizontal: true,
                    vertical: true
                },
                wheel: true
            },
            renderer: 'geras',
            toolbox: null,
            theme,
            trashcan: false,
            zoom: {
                controls: false,
                pinch: false,
                startScale: 0.7,
                wheel: false,
                maxScale: 1,
                minScale: 0.5
            }
        });

        const xmlRoot = doc.getElementById('action-editor-workspace-xml');
        if (xmlRoot) {
            const workspaceXml = Blockly.utils.xml.textToDom(`<xml xmlns="https://developers.google.com/blockly/xml">${xmlRoot.innerHTML}</xml>`);
            Blockly.Xml.domToWorkspace(workspaceXml, workspace);
        }

        const resizeWorkspace = () => {
            Blockly.svgResize(workspace);
        };

        host.dataset.initialized = 'true';
        host.__actionEditorWorkspace = workspace;
        root.__actionEditorWorkspace = workspace;
        resizeWorkspace();

        doc.defaultView.addEventListener('resize', resizeWorkspace);
        doc.defaultView.requestAnimationFrame(resizeWorkspace);
        return workspace;
    }

    function initActionEditorPage(doc) {
        const root = doc.querySelector('.action-editor');
        if (!root || root.dataset.initialized === 'true') return;
        root.dataset.initialized = 'true';

        const menuItems = [...doc.querySelectorAll('[data-menu]')];
        const libraryPanels = [...doc.querySelectorAll('[data-panel]')];
        const workspaceView = doc.querySelector('[data-view="workspace"]');
        const taskView = doc.querySelector('[data-view="tasks"]');
        const areaTabs = [...doc.querySelectorAll('[data-area]')];
        const libraryAreaTabs = [...doc.querySelectorAll('[data-area-tab]')];
        const bottomTabs = [...doc.querySelectorAll('[data-bottom-tab]')];
        const bottomPanes = [...doc.querySelectorAll('[data-bottom-pane]')];
        const libraryTitle = doc.querySelector('[data-library-title]');
        const pythonToggle = doc.querySelector('[data-python-toggle]');
        const runTag = doc.querySelector('[data-run-tag]');
        const runButtons = [...doc.querySelectorAll('[data-run-action]')];
        const switches = [...doc.querySelectorAll('.editor-switch')];
        const blocklyWorkspace = initBlockly(doc, root);

        const menuLabels = {
            program: '程序',
            devices: '设备',
            modules: '模块',
            variables: '变量',
            flows: '动作流程',
            tasks: '任务管理'
        };

        function resizeBlockly() {
            const Blockly = doc.defaultView?.Blockly;
            if (Blockly && blocklyWorkspace) {
                doc.defaultView.requestAnimationFrame(() => Blockly.svgResize(blocklyWorkspace));
            }
        }

        function applyRunState(state) {
            const nextState = state === 'running' ? 'running' : 'stopped';
            root.dataset.runState = nextState;

            if (runTag) {
                runTag.textContent = nextState;
                runTag.classList.toggle('is-running', nextState === 'running');
                runTag.classList.toggle('is-stopped', nextState !== 'running');
            }

            doc.querySelectorAll('.editor-inline-status').forEach((item) => {
                item.textContent = nextState;
                item.classList.toggle('is-running', nextState === 'running');
                item.classList.toggle('is-stopped', nextState !== 'running');
            });
        }

        function applyMenu(menu) {
            root.dataset.activeMenu = menu;

            menuItems.forEach((item) => {
                item.classList.toggle('is-active', item.dataset.menu === menu);
            });

            libraryPanels.forEach((panel) => {
                panel.classList.toggle('is-active', panel.dataset.panel === menu);
            });

            if (libraryTitle) {
                libraryTitle.textContent = menuLabels[menu] || '程序';
            }

            const showTaskView = menu === 'tasks';
            if (workspaceView) workspaceView.classList.toggle('is-active', !showTaskView);
            if (taskView) taskView.classList.toggle('is-active', showTaskView);
            if (!showTaskView) resizeBlockly();
        }

        function applyArea(area) {
            root.dataset.activeArea = area;

            areaTabs.forEach((tab) => {
                tab.classList.toggle('is-active', tab.dataset.area === area);
            });

            libraryAreaTabs.forEach((tab) => {
                tab.classList.toggle('is-active', tab.dataset.areaTab === area);
            });
        }

        function applyBottomTab(tab, options = {}) {
            const shouldOpen = options.open !== false;
            root.dataset.activeBottomTab = tab;
            root.dataset.bottomOpen = shouldOpen ? 'true' : 'false';

            bottomTabs.forEach((item) => {
                item.classList.toggle('is-active', item.dataset.bottomTab === tab);
            });

            bottomPanes.forEach((pane) => {
                pane.classList.toggle('is-active', pane.dataset.bottomPane === tab);
            });

            resizeBlockly();
        }

        menuItems.forEach((item) => {
            item.addEventListener('click', () => applyMenu(item.dataset.menu));
        });

        areaTabs.forEach((item) => {
            item.addEventListener('click', () => applyArea(item.dataset.area));
        });

        libraryAreaTabs.forEach((item) => {
            item.addEventListener('click', () => applyArea(item.dataset.areaTab));
        });

        bottomTabs.forEach((item) => {
            item.addEventListener('click', () => {
                const isActive = item.classList.contains('is-active');
                const isOpen = root.dataset.bottomOpen === 'true';

                if (isActive && isOpen) {
                    root.dataset.bottomOpen = 'false';
                    resizeBlockly();
                    return;
                }

                applyBottomTab(item.dataset.bottomTab);
            });
        });

        if (pythonToggle) {
            pythonToggle.addEventListener('click', () => {
                const nextState = root.dataset.pythonOpen !== 'true';
                root.dataset.pythonOpen = String(nextState);
                resizeBlockly();
            });
        }

        runButtons.forEach((button) => {
            button.addEventListener('click', () => {
                applyRunState(button.dataset.runAction === 'run' ? 'running' : 'stopped');
            });
        });

        switches.forEach((toggle) => {
            toggle.addEventListener('click', () => {
                const pressed = toggle.getAttribute('aria-pressed') === 'true';
                toggle.setAttribute('aria-pressed', String(!pressed));
            });
        });

        applyMenu(root.dataset.activeMenu || 'program');
        applyArea(root.dataset.activeArea || 'transport');
        applyBottomTab(root.dataset.activeBottomTab || 'log', { open: root.dataset.bottomOpen === 'true' });
        applyRunState(root.dataset.runState || 'stopped');
    }

    function initActionEditorShell() {
        const frame = document.getElementById('action-editor-frame');
        if (!frame || frame.dataset.initialized === 'true') return;
        frame.dataset.initialized = 'true';

        const src = frame.getAttribute('data-src') || 'action-editor.html';
        frame.src = src;
        frame.addEventListener('load', () => {
            try {
                initActionEditorPage(frame.contentDocument);
            } catch (error) {
                console.warn('动作编辑器 iframe 初始化失败:', error);
            }
        });
    }

    window.initActionEditorShell = initActionEditorShell;

    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('.action-editor')) {
            initActionEditorPage(document);
        }
    });
})();
