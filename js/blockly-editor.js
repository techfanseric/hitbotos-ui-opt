// Blockly 编辑器

import { defineRobotBlocks } from './blockly-blocks.js';
import { setupBlocklyPythonGenerators } from './blockly-python-gen.js';

class BlocklyEditor {
    constructor(containerElement) {
        this.container = containerElement;
        this.workspace = null;
    }

    init() {
        if (typeof Blockly === 'undefined') {
            this.container.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Blockly 库加载失败</div>';
            return;
        }

        defineRobotBlocks();
        setupBlocklyPythonGenerators();

        var darkTheme = Blockly.Theme.defineTheme('robotDark', {
            base: Blockly.Themes.Classic,
            componentStyles: {
                workspaceBackgroundColour: '#2b2b2b',
                toolboxBackgroundColour: '#333333',
                toolboxForegroundColour: '#ccc',
                flyoutBackgroundColour: '#333333',
                flyoutForegroundColour: '#ccc',
                flyoutOpacity: 0.95,
                scrollbarColour: '#555555',
                scrollbarOpacity: 0.6,
                insertionMarkerColour: '#BD1C22',
                insertionMarkerOpacity: 0.4,
                cursorColour: '#BD1C22'
            },
            fontStyle: {
                family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                weight: '500',
                size: 11
            }
        });

        var toolbox = {
            kind: 'categoryToolbox',
            contents: [
                {
                    kind: 'category',
                    name: '机器人动作',
                    colour: '#2196F3',
                    contents: [
                        { kind: 'block', type: 'robot_move_to' },
                        { kind: 'block', type: 'robot_grab' },
                        { kind: 'block', type: 'robot_release' },
                        { kind: 'block', type: 'robot_rotate' },
                        { kind: 'block', type: 'robot_wait' },
                        { kind: 'block', type: 'robot_set_speed' },
                        { kind: 'block', type: 'robot_is_holding' },
                        { kind: 'block', type: 'robot_get_object_id' }
                    ]
                },
                {
                    kind: 'category',
                    name: '逻辑',
                    colour: '#FF9800',
                    contents: [
                        { kind: 'block', type: 'controls_if' },
                        { kind: 'block', type: 'logic_compare' },
                        { kind: 'block', type: 'logic_operation' },
                        { kind: 'block', type: 'logic_negate' },
                        { kind: 'block', type: 'logic_boolean' },
                        { kind: 'block', type: 'logic_null' },
                        { kind: 'block', type: 'logic_ternary' }
                    ]
                },
                {
                    kind: 'category',
                    name: '循环',
                    colour: '#4CAF50',
                    contents: [
                        { kind: 'block', type: 'controls_repeat_ext' },
                        { kind: 'block', type: 'controls_whileUntil' },
                        { kind: 'block', type: 'controls_for' },
                        { kind: 'block', type: 'controls_forEach' },
                        { kind: 'block', type: 'controls_flow_statements' }
                    ]
                },
                {
                    kind: 'category',
                    name: '数学',
                    colour: '#9C27B0',
                    contents: [
                        { kind: 'block', type: 'math_number' },
                        { kind: 'block', type: 'math_arithmetic' },
                        { kind: 'block', type: 'math_single' },
                        { kind: 'block', type: 'math_trig' },
                        { kind: 'block', type: 'math_constant' },
                        { kind: 'block', type: 'math_number_property' },
                        { kind: 'block', type: 'math_round' },
                        { kind: 'block', type: 'math_modulo' },
                        { kind: 'block', type: 'math_random_int' },
                        { kind: 'block', type: 'math_random_float' }
                    ]
                },
                {
                    kind: 'category',
                    name: '文本',
                    colour: '#E91E63',
                    contents: [
                        { kind: 'block', type: 'text' },
                        { kind: 'block', type: 'text_join' },
                        { kind: 'block', type: 'text_append' },
                        { kind: 'block', type: 'text_length' },
                        { kind: 'block', type: 'text_isEmpty' },
                        { kind: 'block', type: 'text_print' }
                    ]
                },
                {
                    kind: 'category',
                    name: '列表',
                    colour: '#00BCD4',
                    contents: [
                        { kind: 'block', type: 'lists_create_with' },
                        { kind: 'block', type: 'lists_repeat' },
                        { kind: 'block', type: 'lists_length' },
                        { kind: 'block', type: 'lists_isEmpty' },
                        { kind: 'block', type: 'lists_indexOf' },
                        { kind: 'block', type: 'lists_getIndex' },
                        { kind: 'block', type: 'lists_setIndex' }
                    ]
                },
                { kind: 'sep' },
                {
                    kind: 'category',
                    name: '变量',
                    colour: '#FF5722',
                    custom: 'VARIABLE'
                },
                {
                    kind: 'category',
                    name: '函数',
                    colour: '#795548',
                    custom: 'PROCEDURE'
                }
            ]
        };

        this.workspace = Blockly.inject(this.container, {
            toolbox: toolbox,
            theme: darkTheme,
            grid: {
                spacing: 25,
                length: 3,
                colour: '#3a3a3a',
                snap: true
            },
            zoom: {
                controls: true,
                wheel: true,
                startScale: 0.9,
                maxScale: 2,
                minScale: 0.4,
                scaleSpeed: 1.2
            },
            trashcan: true,
            move: {
                scrollbars: true,
                drag: true,
                wheel: true
            },
            sounds: false,
            renderer: 'zelos'
        });

        Blockly.svgResize(this.workspace);
    }

    getPythonCode() {
        if (!this.workspace || typeof python === 'undefined') return '# Blockly workspace not available';
        python.pythonGenerator.init(this.workspace);
        return python.pythonGenerator.workspaceToCode(this.workspace);
    }

    clear() {
        if (this.workspace) {
            this.workspace.clear();
        }
    }

    undo() {
        if (this.workspace) {
            this.workspace.undo(false);
        }
    }

    redo() {
        if (this.workspace) {
            this.workspace.undo(true);
        }
    }

    resize() {
        if (this.workspace) {
            Blockly.svgResize(this.workspace);
        }
    }

    dispose() {
        if (this.workspace) {
            this.workspace.dispose();
            this.workspace = null;
        }
    }
}

export { BlocklyEditor };
