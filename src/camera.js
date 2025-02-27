import * as THREE from 'three';

// Camera variables
let camera;
const cameraOffset = new THREE.Vector3(0, 5, 10);
const lookOffset = new THREE.Vector3(0, 0, 0);

// Mouse camera control variables
const mouseControl = {
    isEnabled: true,
    sensitivity: 0.05, // Low sensitivity for subtle movement
    maxAngle: 0.3, // Maximum rotation angle in radians (about 17 degrees)
    mouseX: 0,
    mouseY: 0
};

export function setupCamera() {
    // Create the camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Set up mouse controls for camera
    setupMouseControls();

    return camera;
}

function setupMouseControls() {
    // Track mouse position
    document.addEventListener('mousemove', (event) => {
        // Convert mouse position to normalized coordinates (-1 to 1)
        mouseControl.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseControl.mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    });
}

export function updateCamera(camera, boat) {
    // Position camera behind boat
    const cameraOffset = new THREE.Vector3(0, 5, 10).applyQuaternion(boat.quaternion);
    camera.position.copy(boat.position).add(cameraOffset);

    if (mouseControl.isEnabled) {
        const horizontalAngle = Math.max(Math.min(mouseControl.mouseX * mouseControl.sensitivity, mouseControl.maxAngle), -mouseControl.maxAngle);
        const verticalAngle = Math.max(Math.min(-mouseControl.mouseY * mouseControl.sensitivity, mouseControl.maxAngle), -mouseControl.maxAngle);

        const lookTarget = boat.position.clone();
        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(boat.quaternion);
        lookTarget.add(rightVector.multiplyScalar(horizontalAngle * 50));
        lookTarget.y += verticalAngle * 50;
        camera.lookAt(lookTarget);
    } else {
        camera.lookAt(boat.position);
    }
}

export function getCamera() {
    return camera;
}

export function getMouseControl() {
    return mouseControl;
}

export function setMouseControlEnabled(enabled) {
    mouseControl.isEnabled = enabled;
} 