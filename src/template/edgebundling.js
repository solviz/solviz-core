// Lazily construct the package hierarchy from class names.
function packageHierarchy(classes) {
    const map = {};

    function find(name, data) {
        let node = map[name];
        let i;
        if (!node) {
            // eslint-disable-next-line no-multi-assign
            node = map[name] = data || { name, children: [] };
            if (name.length) {
                node.parent = find(name.substring(0, i = name.lastIndexOf('.')));
                node.parent.children.push(node);
                node.key = name.substring(i + 1);
            }
        }
        return node;
    }

    classes.forEach((d) => {
        find(d.id, d);
    });

    return d3.hierarchy(map['']);
}

// Return a list of imports for the given array of nodes.
function packageImports(nodes) {
    const map = {};
    const imports = [];

    // Compute a map from name to node.
    nodes.forEach((d) => {
        map[d.data.name] = d;
    });

    // For each import, construct a link from the source to target node.
    nodes.forEach((d) => {
        if (d.data.imports) {
            d.data.imports.forEach((i) => {
                imports.push(map[d.data.name].path(map[i]));
            });
        }
    });

    return imports;
}

function colorNode(name) {
    // iterate through all the dom and get the DOM which has the data
    // eslint-disable-next-line func-names
    d3.selectAll('.node').each(function (d) {
        if (d.data.name === name) {
            d3.select(this).style('fill', 'blue');
        }
    });
}

function colorLink(src) {
    // iterate through all the links for src and target.
    // eslint-disable-next-line func-names
    d3.selectAll('.link').each(function (d) {
        if (d[0].data.name === src) {
            d3.select(this).style('stroke', 'red');
        }
    });
}

// eslint-disable-next-line no-unused-vars
function renderEdgeBundlingVisualization(classes) {
    const diameter = 500;
    const radius = diameter / 2;
    const innerRadius = radius - 120;

    const cluster = d3.cluster()
        .size([360, innerRadius]);

    const line = d3.radialLine()
        .curve(d3.curveBundle.beta(0.85))
        .radius(d => d.y)
        .angle(d => d.x / 180 * Math.PI);

    const svg = d3.select('svg')
        .attr('width', diameter)
        .attr('height', diameter)
        .append('g')
        .attr('transform', `translate(${radius},${radius})`);

    const root = packageHierarchy(classes).sum(d => d.size);

    cluster(root);

    svg.append('g').selectAll('.link')
        .data(packageImports(root.leaves()))
        .enter()
        .append('path')
        // eslint-disable-next-line prefer-destructuring,no-unused-expressions,no-sequences,no-param-reassign
        .each((d) => { d.source = d[0], d.target = d[d.length - 1]; })
        .attr('class', 'link')
        .attr('d', line);

    svg.append('g').selectAll('.node')
        .data(root.leaves())
        .enter()
        .append('text')
        .attr('class', 'node')
        .attr('dy', '0.31em')
        .attr('transform', d => `rotate(${d.x - 90})translate(${d.y + 8},0)${d.x < 180 ? '' : 'rotate(180)'}`)
        .attr('text-anchor', d => (d.x < 180 ? 'start' : 'end'))
        .text(d => d.data.key)
        // eslint-disable-next-line func-names
        .on('mouseover', function (d) {
            // first make all the nodes/links black(reset).
            d3.select(this).style('fill', 'blue');
            // d3.selectAll(".link").style("stroke", "red");
            // iterate over the imports which is the targets of the node(on which it is hovered) and color them.
            d.data.imports.forEach((name) => {
                colorNode(name);
                // color the link for a given source and target name.
                colorLink(d.data.name);
            });
        })
        // eslint-disable-next-line func-names,prefer-arrow-callback
        .on('mouseout', function () {
            d3.selectAll('.node').style('fill', 'black');
            d3.selectAll('.link').style('stroke', 'steelblue');
        });
}
