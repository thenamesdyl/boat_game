import * as THREE from 'three';

/**
 * Creates a simplified Smuggler's Hideout using minimal geometry
 */
export function createSmugglersHideout(params) {
    const {
        parent,
        random = Math.random,
        position = new THREE.Vector3(0, 0, 0),
        cliffFace = 0,
        scale = 1.0
    } = params;

    console.log("Creating simplified Smuggler's Hideout");

    // Create a container
    const hideout = new THREE.Group();
    hideout.position.copy(position);
    hideout.rotation.y = cliffFace;
    parent.add(hideout);

    // Basic materials - extremely simple, no shaders
    const rockMaterial = new THREE.MeshBasicMaterial({ color: 0x7a7a7a });
    const darkRockMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
    const woodMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
    const flagMaterial = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });

    // 1. Main cliff - using a simple box instead of complex geometry
    const cliffGeometry = new THREE.BoxGeometry(40 * scale, 30 * scale, 30 * scale);
    const cliff = new THREE.Mesh(cliffGeometry, rockMaterial);
    cliff.position.set(0, 15 * scale, -15 * scale);
    hideout.add(cliff);

    // 2. Cave entrance - simple cylinder
    const entranceGeometry = new THREE.CylinderGeometry(5 * scale, 5 * scale, 8 * scale, 8, 1, true);
    const entrance = new THREE.Mesh(entranceGeometry, darkRockMaterial);
    entrance.position.set(0, 5 * scale, 0);
    entrance.rotation.x = Math.PI / 2;
    hideout.add(entrance);

    // 3. Door - simple box
    const doorGeometry = new THREE.BoxGeometry(7 * scale, 9 * scale, 0.5 * scale);
    const door = new THREE.Mesh(doorGeometry, woodMaterial);
    door.position.set(3 * scale, 5 * scale, -0.5 * scale);
    door.rotation.y = Math.PI * 0.3; // Partially open
    hideout.add(door);

    // 4. Watch tower - simple shapes
    // Tower base
    const towerBaseGeometry = new THREE.CylinderGeometry(4 * scale, 4 * scale, 1 * scale, 8);
    const towerBase = new THREE.Mesh(towerBaseGeometry, woodMaterial);
    towerBase.position.set(0, 30 * scale, -15 * scale);
    hideout.add(towerBase);

    // Tower post
    const towerPostGeometry = new THREE.CylinderGeometry(0.8 * scale, 0.8 * scale, 15 * scale, 6);
    const towerPost = new THREE.Mesh(towerPostGeometry, woodMaterial);
    towerPost.position.set(0, 22.5 * scale, -15 * scale);
    hideout.add(towerPost);

    // 5. Flag - simple plane
    const flagGeometry = new THREE.PlaneGeometry(2 * scale, 1.2 * scale);
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(2 * scale, 33 * scale, -15 * scale);
    flag.rotation.y = Math.PI * 0.5;
    hideout.add(flag);

    // 6. Just a few key props - barrel and crate
    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(1.5 * scale, 1.5 * scale, 2.5 * scale, 8);
    const barrel = new THREE.Mesh(barrelGeometry, woodMaterial);
    barrel.position.set(-6 * scale, 1.25 * scale, 5 * scale);
    hideout.add(barrel);

    // Crate
    const crateGeometry = new THREE.BoxGeometry(2.5 * scale, 2.5 * scale, 2.5 * scale);
    const crate = new THREE.Mesh(crateGeometry, woodMaterial);
    crate.position.set(6 * scale, 1.25 * scale, 6 * scale);
    crate.rotation.y = Math.PI * 0.2;
    hideout.add(crate);

    // No lights or complex details

    return hideout;
} 