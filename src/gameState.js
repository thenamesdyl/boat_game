// gameState.js - Central store for shared game objects to avoid circular dependencies
import * as THREE from 'three';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });
export const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
export const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
let time = 0;

export function updateTime(deltaTime) {
    time += deltaTime;
}

export function getTime() {
    return time;
}