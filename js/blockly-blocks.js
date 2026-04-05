// 自定义 Blockly Block 定义 - 机器人动作指令

export function defineRobotBlocks() {
    if (typeof Blockly === 'undefined') return;

    Blockly.defineBlocksWithJsonArray([
        // 移动到坐标
        {
            type: 'robot_move_to',
            message0: '移动到 X %1 Y %2 Z %3',
            args0: [
                { type: 'input_value', name: 'X', check: 'Number' },
                { type: 'input_value', name: 'Y', check: 'Number' },
                { type: 'input_value', name: 'Z', check: 'Number' }
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 160,
            tooltip: '移动机器人到指定坐标'
        },
        // 抓取
        {
            type: 'robot_grab',
            message0: '抓取',
            previousStatement: null,
            nextStatement: null,
            colour: 160,
            tooltip: '控制夹爪抓取物体'
        },
        // 释放
        {
            type: 'robot_release',
            message0: '释放',
            previousStatement: null,
            nextStatement: null,
            colour: 160,
            tooltip: '控制夹爪释放物体'
        },
        // 旋转
        {
            type: 'robot_rotate',
            message0: '旋转角度 %1',
            args0: [
                { type: 'input_value', name: 'ANGLE', check: 'Number' }
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 160,
            tooltip: '旋转机器人指定角度'
        },
        // 等待
        {
            type: 'robot_wait',
            message0: '等待 %1 秒',
            args0: [
                { type: 'input_value', name: 'SECONDS', check: 'Number' }
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 160,
            tooltip: '等待指定秒数'
        },
        // 判断是否持有物体（返回布尔值）
        {
            type: 'robot_is_holding',
            message0: '是否持有物体',
            output: 'Boolean',
            colour: 160,
            tooltip: '返回机器人是否持有物体'
        },
        // 获取夹持物体 ID
        {
            type: 'robot_get_object_id',
            message0: '获取夹持物体 ID',
            output: 'String',
            colour: 160,
            tooltip: '返回当前夹持物体的 ID'
        },
        // 设置速度
        {
            type: 'robot_set_speed',
            message0: '设置速度 %1 %',
            args0: [
                { type: 'input_value', name: 'SPEED', check: 'Number' }
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 160,
            tooltip: '设置机器人运动速度（0-100%）'
        }
    ]);
}
