// 动作编辑器 - 主模块

class ActionEditor {
    constructor(windowElement) {
        this.windowElement = windowElement;
        this.content = windowElement.querySelector('.action-editor-content');
        this.currentMode = 'blockly';
        this.blocklyEditor = null;
        this.flowchartEditor = null;
        this.codeMirror = null;
        this.panels = {
            blockly: this.content.querySelector('#blockly-editor'),
            flowchart: this.content.querySelector('#flowchart-editor'),
            code: this.content.querySelector('#code-editor')
        };
        this.tools = {
            blockly: this.content.querySelector('.ae-tools-blockly'),
            flowchart: this.content.querySelector('.ae-tools-flowchart'),
            code: this.content.querySelector('.ae-tools-code')
        };
    }

    async init() {
        this._setupModeSwitch();
        this._setupToolbarActions();
        this._initCodeMirror();

        try {
            const blocklyModule = await import('./blockly-editor.js');
            this.blocklyEditor = new blocklyModule.BlocklyEditor(this.panels.blockly);
            this.blocklyEditor.init();
        } catch (e) {
            console.error('Failed to load Blockly editor:', e);
        }

        try {
            const flowchartModule = await import('./flowchart-editor.js');
            this.flowchartEditor = new flowchartModule.FlowchartEditor(
                this.content.querySelector('#flowchart-canvas')
            );
            this.flowchartEditor.init();
        } catch (e) {
            console.error('Failed to load Flowchart editor:', e);
        }

        this._setupResizeObserver();
    }

    _setupModeSwitch() {
        const modeBtns = this.content.querySelectorAll('.ae-mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.switchMode(mode);
            });
        });
    }

    _setupToolbarActions() {
        this.content.querySelectorAll('.ae-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleToolAction(action);
            });
        });
    }

    _initCodeMirror() {
        const textarea = this.content.querySelector('#python-code');
        if (typeof CodeMirror !== 'undefined' && textarea) {
            this.codeMirror = CodeMirror.fromTextArea(textarea, {
                mode: 'python',
                theme: 'dracula',
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4,
                lineWrapping: true,
                readOnly: false
            });
        }
    }

    _setupResizeObserver() {
        if (!this.content) return;
        const ro = new ResizeObserver(() => {
            this.resize();
        });
        ro.observe(this.content);

        // Also listen for layout manager fullscreen/minimize transitions
        const windowEl = this.windowElement;
        if (windowEl) {
            const observer = new MutationObserver(() => {
                // Delay resize to allow CSS transitions to complete
                setTimeout(() => this.resize(), 350);
            });
            observer.observe(windowEl, { attributes: true, attributeFilter: ['class', 'style'] });
        }
    }

    switchMode(mode) {
        if (mode === this.currentMode) return;

        // Update button states
        this.content.querySelectorAll('.ae-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Hide all panels
        Object.values(this.panels).forEach(panel => {
            if (panel) panel.style.display = 'none';
        });

        // Hide all tool groups
        Object.values(this.tools).forEach(tool => {
            if (tool) tool.style.display = 'none';
        });

        // Show active panel and tools
        if (this.panels[mode]) this.panels[mode].style.display = mode === 'flowchart' ? 'flex' : 'block';
        if (this.tools[mode]) this.tools[mode].style.display = 'flex';

        this.currentMode = mode;
        this.resize();
    }

    generateCode() {
        let code = '';
        if (this.currentMode === 'blockly' && this.blocklyEditor) {
            code = this.blocklyEditor.getPythonCode();
        } else if (this.currentMode === 'flowchart' && this.flowchartEditor) {
            code = this.flowchartEditor.getPythonCode();
        }

        if (this.codeMirror) {
            this.codeMirror.setValue(code);
        }
        this.switchMode('code');
    }

    handleToolAction(action) {
        switch (action) {
            case 'undo':
                if (this.currentMode === 'blockly' && this.blocklyEditor) {
                    this.blocklyEditor.undo();
                }
                break;
            case 'redo':
                if (this.currentMode === 'blockly' && this.blocklyEditor) {
                    this.blocklyEditor.redo();
                }
                break;
            case 'clear':
                if (this.currentMode === 'blockly' && this.blocklyEditor) {
                    this.blocklyEditor.clear();
                } else if (this.currentMode === 'flowchart' && this.flowchartEditor) {
                    this.flowchartEditor.clear();
                }
                break;
            case 'auto-layout':
                if (this.flowchartEditor) {
                    this.flowchartEditor.autoLayout();
                }
                break;
            case 'zoom-in':
                if (this.flowchartEditor) {
                    this.flowchartEditor.zoomIn();
                }
                break;
            case 'zoom-out':
                if (this.flowchartEditor) {
                    this.flowchartEditor.zoomOut();
                }
                break;
            case 'copy':
                if (this.codeMirror) {
                    const code = this.codeMirror.getValue();
                    navigator.clipboard.writeText(code).then(() => {
                        console.log('Code copied to clipboard');
                    });
                }
                break;
            case 'run':
                if (this.codeMirror) {
                    const code = this.codeMirror.getValue();
                    console.log('Running code:', code);
                    // TODO: integrate with simulation engine
                }
                break;
            case 'generate-code':
                this.generateCode();
                break;
        }
    }

    resize() {
        if (this.currentMode === 'blockly' && this.blocklyEditor) {
            this.blocklyEditor.resize();
        } else if (this.currentMode === 'flowchart' && this.flowchartEditor) {
            this.flowchartEditor.resize();
        } else if (this.currentMode === 'code' && this.codeMirror) {
            this.codeMirror.refresh();
        }
    }

    getCurrentMode() {
        return this.currentMode;
    }
}

// Export for ES module import
export { ActionEditor };
