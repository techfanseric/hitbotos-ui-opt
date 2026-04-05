// JointJS Graph -> Python 代码生成器

export function generatePythonFromGraph(graph) {
    if (!graph) return '# No graph';

    var cells = graph.getCells();
    var elements = cells.filter(function(c) { return c.isElement(); });
    var links = cells.filter(function(c) { return c.isLink(); });

    if (elements.length === 0) return '# Empty flowchart';

    // Find start node
    var startNode = null;
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].get('nodeType') === 'start') {
            startNode = elements[i];
            break;
        }
    }

    if (!startNode) return '# No start node found';

    // Build adjacency list
    var adj = {};
    elements.forEach(function(el) {
        adj[el.id] = [];
    });

    links.forEach(function(link) {
        var sourceId = link.get('source').id;
        var targetId = link.get('target').id;
        if (sourceId && targetId && adj[sourceId]) {
            var label = (link.get('labels') && link.get('labels')[0]) ? link.get('labels')[0].attrs.text.text : '';
            adj[sourceId].push({ id: targetId, label: label });
        }
    });

    // Build element map
    var elemMap = {};
    elements.forEach(function(el) {
        elemMap[el.id] = el;
    });

    // Generate code by traversing from start
    var lines = [];
    var visited = new Set();

    function traverse(nodeId, indent) {
        if (!nodeId || visited.has(nodeId)) return;
        visited.add(nodeId);

        var node = elemMap[nodeId];
        if (!node) return;

        var nodeType = node.get('nodeType');
        var prefix = '    '.repeat(indent);

        switch (nodeType) {
            case 'start':
                // No code for start node
                break;

            case 'end':
                // No code for end node
                return;

            case 'action':
                var label = node.attr('label/text') || 'robot.action()';
                lines.push(prefix + label);
                break;

            case 'decision':
                var condition = node.attr('label/text') || 'True';
                var children = adj[nodeId] || [];
                var trueTarget = null;
                var falseTarget = null;

                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    if (child.label === 'Y' || child.label === 'Yes' || child.label === 'True' || i === 0) {
                        trueTarget = child.id;
                    } else {
                        falseTarget = child.id;
                    }
                }

                lines.push(prefix + 'if ' + condition + ':');

                if (trueTarget) {
                    traverse(trueTarget, indent + 1);
                } else {
                    lines.push(prefix + '    pass');
                }

                if (falseTarget) {
                    lines.push(prefix + 'else:');
                    traverse(falseTarget, indent + 1);
                }

                return;
        }

        // Continue to next connected node
        var nextNodes = adj[nodeId] || [];
        if (nextNodes.length > 0) {
            traverse(nextNodes[0].id, indent);
        }
    }

    traverse(startNode.id, 0);

    if (lines.length === 0) {
        return '# Empty flowchart (only start/end nodes)';
    }

    return lines.join('\n') + '\n';
}
