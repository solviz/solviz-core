const linkedByIndex = {};
let simulation;
let link;
let node;

function ticked() {
    link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    node
        .attr('transform', d => `translate(${d.x},${d.y})`);
}

function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
}
function releasenode(d) {
    d.fx = null;
    d.fy = null;
}

function isConnected(a, b) {
    return linkedByIndex[`${a.index},${b.index}`] || linkedByIndex[`${b.index},${a.index}`] || a.index === b.index;
}

function fade(opacity) {
    return (d) => {
        // eslint-disable-next-line func-names
        node.style('stroke-opacity', function (o) {
            const thisOpacity = isConnected(d, o) ? 1 : opacity;
            this.setAttribute('fill-opacity', thisOpacity);
            return thisOpacity;
        });

        link.style('stroke-opacity', o => (o.source === d || o.target === d ? 1 : opacity));
    };
}

// eslint-disable-next-line no-unused-vars
function renderVisualization(graph) {
    const svg = d3.select('svg');
    const width = +svg.attr('width');
    const height = +svg.attr('height');

    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    const color = d3.scaleOrdinal(d3.schemeCategory20);

    simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id(d => d.id))
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter(width / 2, height / 2));


    link = svg.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(graph.links)
        .enter()
        .append('line')
        .attr('stroke-width', d => Math.sqrt(d.value));

    node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(graph.nodes)
        .enter()
        .append('g')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    node.append('circle')
        .attr('r', 5)
        .attr('fill', d => color(d.group))
        .on('mouseover.tooltip', (d) => {
            tooltip.transition()
                .duration(300)
                .style('opacity', 0.8);
            tooltip.html(`Name:${d.id}<p/>group:${d.group}`)
                .style('left', `${d3.event.pageX}px`)
                .style('top', `${d3.event.pageY + 10}px`);
        })
        .on('mouseover.fade', fade(0.1))
        .on('mouseout.tooltip', () => {
            tooltip.transition()
                .duration(100)
                .style('opacity', 0);
        })
        .on('mouseout.fade', fade(1))
        .on('mousemove', () => {
            tooltip.style('left', `${d3.event.pageX}px`)
                .style('top', `${d3.event.pageY + 10}px`);
        })
        .on('dblclick', releasenode);

    // show node labels on node
    node.append('text')
        .text(d => d.id)
        .attr('x', 6)
        .attr('y', 3);


    simulation
        .nodes(graph.nodes)
        .on('tick', ticked);

    simulation.force('link')
        .links(graph.links);

    graph.links.forEach((d) => {
        linkedByIndex[`${d.source.index},${d.target.index}`] = 1;
    });
}
