// Import Three.js and additional modules
import * as THREE from "../node_modules/three/build/three.module.js";
import { XRButton } from "./XRButton.js";
import { HTMLMesh } from "../node_modules/three/examples/jsm/interactive/HTMLMesh.js";

const INDOORS = false; 

export class Scene {
    constructor() {
        this.floorY = (INDOORS ? 0.725 : 0);
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupRenderer();
        this.setupRoom();
        this.setupVR();
        this.animate();
        this.handleResize();
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }
    
    handleResize() {
        let width = this.container.clientWidth * 0.99;
        let height = this.container.clientHeight * 0.99;
        this.camera.aspect = width / height;
        this.renderer.setSize(width, height);
        this.camera.updateProjectionMatrix();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.container = document.getElementById('three');
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        this.camera.position.set(0, this.floorY+0.5, 0.5);
    }

    setupLights() {
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(-0.5, 4, -1);
        light.castShadow = true;
        this.scene.add(light);

        const ambientLight = new THREE.AmbientLight(INDOORS ? 0xedc28a : 0xeeeeff, INDOORS ? 0.25 : 1.5);
        this.scene.add(ambientLight);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.xr.enabled = true;
        this.renderer.xr.setFramebufferScaleFactor(1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.bias = -0.003;
        this.renderer.shadowMap.width = 2048;
        this.renderer.shadowMap.height = 2048;
        // this.renderer.shadowMap.autoUpdate = false;
        // this.renderer.shadowMap.needsUpdate = true;
        this.renderer.localClippingEnabled = true;
        this.container.appendChild(this.renderer.domElement);
    }

    setupRoom() {
        this.room = new THREE.Group();
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.8 }));
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this.room.add(plane);
        this.room.scale.set(0.5, 0.5, 0.5);
        this.room.position.y = this.floorY;
        this.room.position.z = -1;
        this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.floorY);
        this.scene.add(this.room);
        this.addGridRoom();
    }

    addGridRoom() {
        this.gridRoom = new THREE.Group();
        const grid = new THREE.GridHelper(10, 20, 0x000000, 0x000000);
        // color #cccccc
        grid.material.color.setRGB(1,1,1);
        grid.material.opacity = 1;
        grid.material.transparent = true;
        this.gridRoom.add(grid);
        this.gridRoom.position.y = this.floorY;
        this.scene.add(this.gridRoom);
    }

    setupVR() {
        const controller = this.renderer.xr.getController(0);
        const controllerGrip = this.renderer.xr.getControllerGrip(0);
        controllerGrip.addEventListener('selectstart', () => this.onSelectStart());
        controllerGrip.addEventListener('selectend', () => this.onSelectEnd());
        this.scene.add(controllerGrip);
        this.scene.add(controller);
        const button = XRButton.createButton(this.renderer, this.onXRstart.bind(this));
        if (button) {
            document.getElementById("three").appendChild(button);
            this.XRsupported = true;
        } else {
            this.XRsupported = false;
        }
    }

    animate() {
        this.renderer.setAnimationLoop(() => this.render());
    }

    consoleMesh() {
        const sidebar = document.getElementById('console');
        sidebar.style.width = '640px';
        sidebar.style.height = '200px';
        const mesh = new HTMLMesh(sidebar);
        mesh.scale.set(0.4, 0.4, 0.4);
        mesh.material.doubleSided = true;

        this.scene.add(mesh);
        mesh.position.z = -0.15;
        mesh.position.x = 0;
        mesh.position.y = 1.15;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onSelectStart() {
        // Called on XR controller button press
    }

    onSelectEnd() {
        // Called on XR controller button release
    }

    onXRstart(session) {
        this.consoleMesh();
        // remove the grid room
        this.scene.remove(this.gridRoom);
        console.log(session);
    }
}
