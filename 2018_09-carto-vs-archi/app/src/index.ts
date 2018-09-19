import * as THREE from "three";
import * as Papa from "papaparse";

parseData("data/route_coordinates.csv", createVisualization);

function parseData(url: string, callBack: any) {
    Papa.parse(url, {
        download: true,
        dynamicTyping: true,
        delimiter: ",",
        fastMode: true,
        header: true,
        complete: function (results) {
            callBack(results.data);
        }
    });
}

function createVisualization(data: Array<ImportedData>) {
    // setup a scene
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(463700, 2800, 6834000);
    camera.lookAt(463559, 2393, 6833876);

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //create a blue LineBasicMaterial
    var material = new THREE.LineBasicMaterial({ color: 0x0000ff });

    var geometry = new THREE.Geometry();

    data.forEach(point => {
        geometry.vertices.push(new THREE.Vector3(point.X, point.DEM, point.Y));
    });

    var line = new THREE.Line(geometry, material);

    scene.add(line);

    // camera.position.z = 5;S

    var animate = function () {
        requestAnimationFrame(animate);

        // line.rotation.x += 0.01;
        // line.rotation.y += 0.01;

        renderer.render(scene, camera);
    };

    animate();
}

interface ImportedData{
    X: number,
    Y: number,
    DEM: number
}