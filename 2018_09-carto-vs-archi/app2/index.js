var origin = [450, 300], j = 200, scale = 1
let yLine = []
let hikingRoute = [];
let beta = 0, alpha = 0, startAngle = Math.PI / 4;
var svg = d3.select("svg")
    .call(d3.drag()
        .on("drag", dragged)
        .on("start", dragStart)
        .on("end", dragEnd))
    .append("g");

var mx, my, mouseX, mouseY;

let flatview = true;

// load csv data
let data = loadData("data/route_coordinates.csv", "data/dem_pts.csv");

let color = d3.scaleLinear()
    .interpolate(d3.interpolateHcl)
    .range([d3.rgb("#007AFF"), d3.rgb("#FFF500")]);


data.then(csvData => {
    color.domain([0, /* (csvData.ELEV.max - csvData.ELEV.min) / 20 */100]);

    init(csvData);

    d3.selectAll("button").on("click", () => {
        flatview = !flatview;
        init(csvData);
    });
})

var surface3d = d3._3d()
    .scale(scale)
    .x(function (d) { return d.x; })
    .y(function (d) { return d.y; })
    .z(function (d) { return d.z; })
    .origin(origin)
    .rotateY(startAngle)
    .rotateX(-startAngle)
    .shape("SURFACE", 20);


var route3d = d3._3d()
    .shape("LINE_STRIP")
    .origin(origin)
    .rotateY(startAngle)
    .rotateX(-startAngle)
    .scale(scale);

function processData(data, tt) {

    /* ----------- surface3d ----------- */

    let planes = svg.selectAll("path.surface").data(data[0], function (d) { return d.plane; });

    planes
        .enter()
        .append("path")
        .attr("class", "_3d surface")
        .attr("fill", "blue")
        .attr("opacity", 0)
        .attr("stroke-opacity", 0.1)
        .merge(planes)
        .attr("stroke", "black")
        .transition().duration(tt)
        .attr("opacity", 1)
        .attr("fill", "blue")
        .attr("d", surface3d.draw);

    planes.exit().remove();


    /* ----------- hiking route ----------- */

    let hikingRoutePath = svg.selectAll("path.hikingRoutePath").data(data[1]);

    hikingRoutePath
        .enter()
        .append("path")
        .attr("class", "_3d hikingRoutePath")
        .merge(hikingRoutePath)
        .transition().duration(tt)
        .attr("fill", "none")
        .attr("stroke", d => color(d.y))
        .attr("stroke-width", 2)
        .attr("d", route3d.draw);

    hikingRoutePath.exit().remove();

    d3.selectAll("._3d").sort(d3._3d().sort);
}

function posPointX(d) {
    return d.projected.x;
}

function posPointY(d) {
    return d.projected.y;
}

function init(csvData) {

    plane = [];
    csvData.contoursData.forEach(row => {
        plane.push({ x: row.X, y: row.ELEV, z: row.Y })
    });

    debugger
    for (var z = -j; z < j; z = z + j / 10) {
        for (var x = -j; x < j; x = x + j / 10) {
            plane.push({ x: x, y: Math.random() * 100, z: z })
        }
    }

    hikingRoute = [];
    csvData.routeData.forEach(row => {
        hikingRoute.push([row.X, flatview ? 0 : row.ELEV, row.Y])
    });


    var data = [
        surface3d(plane),
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
        surface3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)(plane),
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

            dataObject.contoursData = updateCoordinates(dataObject, dataObject.contoursData, 20);
            dataObject.routeData = updateCoordinates(dataObject, dataObject.routeData, 20);

            resolve(dataObject);
        });
    });
}


function updateCoordinates(dataObject, data, constant) {
    data.forEach(row => {
        row.X = (row.X - dataObject.X.min - (dataObject.X.max - dataObject.X.min) / 2) / constant;
        row.Y = (row.Y - dataObject.Y.min - (dataObject.Y.max - dataObject.Y.min) / 2) / constant;
        row.ELEV = (row.ELEV - dataObject.ELEV.min) / constant;
    });
    return data;
}


function getCSVData(path) {
    return new Promise(resolve => {
        let dataObject = { data: new Array() };
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
                            dataObject[`${colName}`] = { min: rowObject[`${colName}`], max: rowObject[`${colName}`] }
                        }
                    }
                });
                dataObject.data.push(rowObject);
            });
            resolve(dataObject);
        });
    });
}