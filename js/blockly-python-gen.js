// 自定义 Block 的 Python 代码生成器

export function setupBlocklyPythonGenerators() {
    if (typeof python === 'undefined' || typeof python.pythonGenerator === 'undefined') return;

    const Order = python.pythonGenerator.ORDER_ATOMIC;

    python.pythonGenerator.forBlock['robot_move_to'] = function(block, generator) {
        const x = generator.valueToCode(block, 'X', Order) || '0';
        const y = generator.valueToCode(block, 'Y', Order) || '0';
        const z = generator.valueToCode(block, 'Z', Order) || '0';
        return 'robot.move_to(' + x + ', ' + y + ', ' + z + ')\n';
    };

    python.pythonGenerator.forBlock['robot_grab'] = function(block, generator) {
        return 'robot.grab()\n';
    };

    python.pythonGenerator.forBlock['robot_release'] = function(block, generator) {
        return 'robot.release()\n';
    };

    python.pythonGenerator.forBlock['robot_rotate'] = function(block, generator) {
        const angle = generator.valueToCode(block, 'ANGLE', Order) || '0';
        return 'robot.rotate(' + angle + ')\n';
    };

    python.pythonGenerator.forBlock['robot_wait'] = function(block, generator) {
        const seconds = generator.valueToCode(block, 'SECONDS', Order) || '1';
        return 'robot.wait(' + seconds + ')\n';
    };

    python.pythonGenerator.forBlock['robot_is_holding'] = function(block, generator) {
        return ['robot.is_holding()', Order];
    };

    python.pythonGenerator.forBlock['robot_get_object_id'] = function(block, generator) {
        return ['robot.get_object_id()', Order];
    };

    python.pythonGenerator.forBlock['robot_set_speed'] = function(block, generator) {
        const speed = generator.valueToCode(block, 'SPEED', Order) || '100';
        return 'robot.set_speed(' + speed + ')\n';
    };
}
