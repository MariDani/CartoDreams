const origin = [450, 300], j = 200
const scale = 1;
let hikingRoute = [];
let heightPoints = [];
let beta = 0, alpha = 0, startAngle = Math.PI / 4, key = function (d) { return d.id; };

let svg = d3.select("svg")
    .call(d3.drag()
        .on("drag", dragged)
        .on("start", dragStart)
        .on("end", dragEnd))
    .append("g");

let scaleLine = svg.append("g")
    .append("line")

let scaleText = svg.append("g")
    .append("text")

let mx, my, mouseX, mouseY;

let flatview = true;

let distance = [0, 0];

// load csv data
let data = loadData("data/route_coordinates.csv", "data/height-points5.csv");

let color = d3.scaleLinear()
    .interpolate(d3.interpolateHcl)
    .range([d3.rgb("#4fb576"), d3.rgb("#44c489"), d3.rgb("#28a9ae"), d3.rgb("#28a2b7"), d3.rgb("#4c7788"), d3.rgb("#6c4f63"), d3.rgb("#432c39")]);


data.then(csvData => {
    const colorDomain = csvData.ELEV.max - csvData.ELEV.min;
    color.domain([colorDomain * 0, colorDomain * 0.3, colorDomain * 0.46, colorDomain * 0.59, colorDomain * 0.71, colorDomain * 0.86, colorDomain]);

    init(csvData);

    d3.selectAll("button").on("click", () => {
        flatview = !flatview;
        init(csvData);
    });
})

var route3d = d3._3d()
    .shape("LINE_STRIP")
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


function processData(data, tt) {



    scaleLine
        .attr("x1", 300)
        .attr("y1", 450)
        .attr("y2", 450)
        .attr("stroke-width", 2)
        .attr("stroke", d3.rgb("#e21b46"))
        .transition().duration(tt)
        .attr("x2", flatview ? 300 + distance[0] / 21.5 : 300 + distance[1] / 21.5);

    scaleText
        .attr("x", 300)
        .attr("y", 465)
        .attr("fill", d3.rgb("#e21b46"))
        .attr("font-family", "sans-serif")
        .attr("font-size", "12px")
        .transition().duration(tt / 3)
        .style("opacity", 0.3)
        .transition().duration(tt / 3 * 2)
        .text(flatview ? `${Math.round(distance[0])} m` : `${Math.round(distance[1])} m`)
        .style("opacity", 1)


    /* ----------- hiking route ----------- */

    let hikingRoutePath = svg.selectAll("path.hikingRoutePath").data(data[0]);

    hikingRoutePath
        .enter()
        .append("path")
        .attr("class", "_3d hikingRoutePath")
        .attr('opacity', 0)
        .merge(hikingRoutePath)
        .transition().duration(tt)
        .attr('opacity', 1)
        .attr("fill", "none")
        .attr("stroke", d3.rgb("#e21b46"))
        .attr("stroke-width", 2)
        .attr("d", route3d.draw);

    hikingRoutePath.exit().remove();

    /* ----------- height points ----------- */

    let points = svg.selectAll("circle").data(data[1], key);

    points
        .enter()
        .append('circle')
        .attr('class', '_3d')
        .attr('cx', posPointX)
        .attr('cy', posPointY)
        .attr('opacity', 0)
        .merge(points)
        .transition().duration(tt)
        .attr('r', 2)
        .attr('stroke', d => d3.color(color(d.y)))
        .attr("stroke-opacity", 0.2)
        .attr("stroke-width", 2)
        .attr('fill', d => color(d.y))
        .attr('opacity', 1)
        .attr('cx', posPointX)
        .attr('cy', posPointY);

    points.exit().remove();


    d3.selectAll("._3d").sort(d3._3d().sort);
}

function posPointX(d) {
    return d.projected.x;
}

function posPointY(d) {
    return d.projected.y;
}

let scaleX = d3.scaleLinear();
let scaleZ = d3.scaleLinear();

function init(csvData) {

    const roundedX = Math.floor(csvData.X.max);
    const roundedY = Math.floor(csvData.Y.max);

    scaleX
        .domain([-roundedX, roundedX])
        .range([-j, j])

    scaleZ
        .domain([-roundedY, roundedY])
        .range([-j, j])

    let cnt = 0;
    heightPoints = [];

    csvData.DEMData.forEach(row => {
        heightPoints.push({ x: scaleX(row.X), y: flatview ? 0 : row.ELEV, z: scaleZ(row.Y), id: 'point_' + cnt++ })
    });

    hikingRoute = [];
    csvData.routeData.forEach(row => {
        hikingRoute.push([scaleX(row.X), flatview ? 2 : row.ELEV + 2, scaleZ(row.Y)])
    });


    var data = [
        route3d([hikingRoute]),
        point3d(heightPoints)
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
        route3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)([hikingRoute]),
        point3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)(heightPoints)
    ];
    processData(data, 0);
}

function dragEnd() {
    mouseX = d3.event.x - mx + mouseX;
    mouseY = d3.event.y - my + mouseY;
}


function loadData(routePath, DEMPath) {
    return new Promise(resolve => {

        let dataObject = {}
        let routeData = getCSVData(routePath);
        let DEMData = getCSVData(DEMPath);

        Promise.all([routeData, DEMData]).then(files => {
            dataObject.routeData = files[0].data;
            dataObject.DEMData = files[1].data;

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

            for (let idx = 0; idx < dataObject.routeData.length - 1; idx++) {

                const vector = [
                    dataObject.routeData[idx + 1].X - dataObject.routeData[idx].X,
                    dataObject.routeData[idx + 1].ELEV - dataObject.routeData[idx].ELEV,
                    dataObject.routeData[idx + 1].Y - dataObject.routeData[idx].Y
                ]

                distance[0] = distance[0] + Math.sqrt(vector[0] * vector[0] + vector[2] * vector[2]);
                distance[1] = distance[1] + Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]);
            }

            dataObject.DEMData = updateCoordinates(dataObject, dataObject.DEMData, 20);
            dataObject.routeData = updateCoordinates(dataObject, dataObject.routeData, 20);

            dataObject.X = updateMinMax(dataObject.X, 20);
            dataObject.Y = updateMinMax(dataObject.Y, 20);
            const newELEVmin = (dataObject.ELEV.min - dataObject.ELEV.min) / 20;
            const newELEVmax = (dataObject.ELEV.max - dataObject.ELEV.min) / 20;
            dataObject.ELEV.min = newELEVmin;
            dataObject.ELEV.max = newELEVmax;

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

function updateMinMax(minMaxObject, constant) {
    let newMin = (minMaxObject.min - minMaxObject.min - (minMaxObject.max - minMaxObject.min) / 2) / constant;
    let newMax = (minMaxObject.max - minMaxObject.min - (minMaxObject.max - minMaxObject.min) / 2) / constant;
    minMaxObject.min = newMin;
    minMaxObject.max = newMax;
    return minMaxObject;
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