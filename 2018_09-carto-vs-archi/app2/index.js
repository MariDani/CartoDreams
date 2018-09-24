var origin = [480, 300], j = 200, scale = 2
let scatter = []
let yLine = []
let xGrid = []
let hikingRoute = [];
let contours = [];
let beta = 0, alpha = 0, key = function (d) { return d.id; }, startAngle = Math.PI / 4;
var svg = d3.select('svg').call(d3.drag().on('drag', dragged).on('start', dragStart).on('end', dragEnd)).append('g');

var mx, my, mouseX, mouseY;

let flatview = true;

// load csv data
let data = loadData("data/route_coordinates.csv", "data/contours_coordinates.csv");

let myYScale = d3.scaleLinear()
    .range([0, j]);

let color = d3.scaleLinear()
    // .domain(myYScale.range())
    .interpolate(d3.interpolateHcl)
    .range([d3.rgb("#007AFF"), d3.rgb('#FFF500')]);


data.then(csvData => {
    color.domain([csvData.ELEV.min / 30, csvData.ELEV.max / 30]);

    init(csvData);

    d3.selectAll('button').on('click', () => {
        flatview = !flatview;
        init(csvData);
    });
})




var grid3d = d3._3d()
    .shape('GRID', 20)
    .origin(origin)
    .rotateY(startAngle)
    .rotateX(-startAngle)
    .scale(scale);

var point3d = d3._3d()
    .x(function (d) { return d.x; })
    .y(function (d) { return d.y; })
    .z(function (d) { return d.z; })
    .origin(origin)
    .rotateY(startAngle)
    .rotateX(-startAngle)
    .scale(scale);

var yScale3d = d3._3d()
    .shape('LINE_STRIP')
    .origin(origin)
    .rotateY(startAngle)
    .rotateX(-startAngle)
    .scale(scale);

var route3d = d3._3d()
    .shape('LINE_STRIP')
    .origin(origin)
    .rotateY(startAngle)
    .rotateX(-startAngle)
    .scale(scale);

function processData(data, tt) {

    /* ----------- GRID ----------- */

    var xGrid = svg.selectAll('path.grid').data(data[0], key);

    xGrid
        .enter()
        .append('path')
        .attr('class', '_3d grid')
        .merge(xGrid)
        .attr('stroke', 'black')
        .attr('stroke-width', 0.3)
        .attr('fill', function (d) { return d.ccw ? 'lightgrey' : '#717171'; })
        .attr('fill-opacity', 0.9)
        .attr('d', grid3d.draw);

    xGrid.exit().remove();

    /* ----------- POINTS ----------- */

    var points = svg.selectAll('circle').data(data[1], key);

    points
        .enter()
        .append('circle')
        .attr('class', '_3d')
        .attr('opacity', 0)
        .attr('cx', posPointX)
        .attr('cy', posPointY)
        .merge(points)
        .transition().duration(tt)
        .attr('r', 3)
        .attr('stroke', d => d3.color(color(d.y)).darker(3))
        .attr('fill', d => color(d.y))
        .attr('opacity', 1)
        .attr('cx', posPointX)
        .attr('cy', posPointY);

    points.exit().remove();


    /* ----------- hiking route ----------- */

    var hikingRoutePath = svg.selectAll('path.hikingRoutePath').data(data[3]);

    hikingRoutePath
        .enter()
        .append('path')
        .attr('class', '_3d hikingRoutePath')
        .merge(hikingRoutePath)
        .transition().duration(tt)
        .attr('fill', 'none')
        .attr('stroke', d => color(d.y))
        .attr('stroke-width', 2)
        .attr('d', route3d.draw);

    hikingRoutePath.exit().remove();


    /* ----------- y-Scale ----------- */

    var yScale = svg.selectAll('path.yScale').data(data[2]);

    yScale
        .enter()
        .append('path')
        .attr('class', '_3d yScale')
        .merge(yScale)
        .transition().duration(tt)
        .attr('stroke', 'black')
        .attr('stroke-width', .5)
        .attr('d', yScale3d.draw);

    yScale.exit().remove();

    /* ----------- y-Scale Text ----------- */

    var yText = svg.selectAll('text.yText').data(data[2][0]);

    yText
        .enter()
        .append('text')
        .attr('class', '_3d yText')
        .attr('dx', '.3em')
        .merge(yText)
        .transition().duration(tt)
        .each(function (d) {
            d.centroid = { x: d.rotated.x, y: d.rotated.y, z: d.rotated.z };
        })
        .attr('x', function (d) { return d.projected.x; })
        .attr('y', function (d) { return d.projected.y; })
        .text((d) => flatview ? "" : myYScale.invert(d[1]));

    yText.exit().remove();


    d3.selectAll('._3d').sort(d3._3d().sort);
}

function posPointX(d) {
    return d.projected.x;
}

function posPointY(d) {
    return d.projected.y;
}

function init(csvData) {
    xGrid = [], scatter = [], yLine = [];
    for (var z = -j; z < j; z = z + j / 10) {
        for (var x = -j; x < j; x = x + j / 10) {
            xGrid.push([x, -1, z]);
        }
    }

    hikingRoute = [];
    csvData.routeData.forEach(row => {
        hikingRoute.push([row.X / 30, flatview ? 0 : row.ELEV / 30, row.Y / 30])
    });

    csvData.contoursData.forEach((row, index) => {
        scatter.push({
            x: row.X / 30,
            y: flatview ? 0 : row.ELEV / 30,
            z: row.Y / 30,
            id: 'point_' + index
        });
    });

    // contours = [];
    // let id;
    // let index = 0;
    // csvData.contoursData.forEach(row => {
    //     if (!id) id = row.ID;
    //     if (id !== row.ID) {
    //         index++;
    //         id = row.ID;
    //     }
    //     if (!contours[index]) contours[index] = new Array();
    //     contours[index].push([row.X / 30, flatview ? 0 : row.ELEV / 30, row.Y / 30]);
    // });


    yLine = [];
    d3.range(0, j, j / 10).forEach(d => {
        yLine.push([-j, flatview ? 0 : d, j])
    });


    var data = [
        grid3d(xGrid),
        point3d(scatter),
        yScale3d([yLine]),
        route3d([hikingRoute])
    ];
    processData(data, 1000);
}

function dragStart() {
    mx = d3.event.x;
    my = d3.event.y;
}

function dragged() {
    mouseX = mouseX || 0;
    mouseY = mouseY || 0;
    beta = (d3.event.x - mx + mouseX) * Math.PI / 230;
    alpha = (d3.event.y - my + mouseY) * Math.PI / 230 * (-1);
    var data = [
        grid3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)(xGrid),
        point3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)(scatter),
        yScale3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)([yLine]),
        route3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)([hikingRoute])
    ];
    processData(data, 0);
}

function dragEnd() {
    mouseX = d3.event.x - mx + mouseX;
    mouseY = d3.event.y - my + mouseY;
}




function loadData(routePath, contoursPath) {
    return new Promise(resolve => {

        let dataObject = {}
        let routeData = getCSVData(routePath);
        let contoursData = getCSVData(contoursPath);

        Promise.all([routeData, contoursData]).then(files => {
            dataObject.routeData = files[0].data;
            dataObject.contoursData = files[1].data;

            files.forEach(file => {
                Object.entries(file).forEach(([key, value]) => {
                    if (key != "data") {
                        if (dataObject[`${key}`]) {
                            if (value.min < dataObject[`${key}`].min) dataObject[`${key}`].min = value.min;
                            if (value.max > dataObject[`${key}`].max) dataObject[`${key}`].max = value.max;
                        }
                        else dataObject[`${key}`] = value;
                    }
                });
            });


            dataObject.routeData.forEach(row => {
                row.X -= dataObject.X.min;
                row.Y -= dataObject.Y.min;
                row.ELEV -= dataObject.ELEV.min;
            });

            dataObject.contoursData.forEach(row => {
                row.X -= dataObject.X.min;
                row.Y -= dataObject.Y.min;
                row.ELEV -= dataObject.ELEV.min;
            });

            resolve(dataObject);
        });
    });
}


function getCSVData(path) {
    return new Promise(resolve => {
        let dataObject = {
            data: new Array()
        }

        d3.csv(path, data => {
            data.forEach(row => {
                let rowObject = new Object();
                Object.entries(row).forEach(([colName, colValue]) => {
                    if (colName) {
                        rowObject[`${colName}`] = parseFloat(colValue);

                        // check min and max values
                        if (dataObject[`${colName}`]) {
                            if (rowObject[`${colName}`] < dataObject[`${colName}`].min) {
                                dataObject[`${colName}`].min = rowObject[`${colName}`];
                            }
                            if (rowObject[`${colName}`] > dataObject[`${colName}`].max) {
                                dataObject[`${colName}`].max = rowObject[`${colName}`];
                            }
                        }
                        else {
                            dataObject[`${colName}`] = {
                                min: rowObject[`${colName}`],
                                max: rowObject[`${colName}`]
                            }
                        }
                    }
                });
                dataObject.data.push(rowObject);
            });
            resolve(dataObject);
        });
    });
}