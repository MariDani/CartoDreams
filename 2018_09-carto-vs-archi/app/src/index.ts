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
    scene.background = new THREE.Color(0xb3e2e5);
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 50000);
    camera.position.set(465600, 4000, 6833700);
    camera.lookAt(465600, /* 2393 */0, 6833700);

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //create a blue LineBasicMaterial
    var material = new THREE.LineBasicMaterial({ color: 0x55aa58 });

    var geometry = new THREE.Geometry();

    data.forEach(point => {
        if (point.X != undefined && point.Y != undefined) {
            geometry.vertices.push(new THREE.Vector3(point.X, /* point.DEM */0, point.Y));
        }
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

interface ImportedData {
    X: number,
    Y: number,
    DEM: number
}