// The renderer and the scene's fixed parts: canvas, WebGL renderer, the PS1 post pass, scene, camera, the ocean and the sky.
// Created once at load; resize keeps them fitted to the window.
import * as THREE from 'three';
import { params } from './config.js';
import './state.js';   // state (and the pixel UI) first: the original boot order
import { initMaterials, PostFX } from '../psx.js';
import { Ocean } from '../ocean.js';
import { Sky } from '../sky.js';

export const canvas = document.getElementById('game');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!params.get('shot') });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = true;
renderer.info.autoReset = false; // we reset once per frame so stats cover both passes
initMaterials();
export const post = new PostFX(renderer);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfeaff, 90, 330);
export const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 1600);

export const ocean = new Ocean();
ocean.material.transparent = true; ocean.mesh.renderOrder = -1; // can turn see-through (glass calm)
scene.add(ocean.mesh);
export const sky = new Sky(scene);

export function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  post.resize(w, h);
}
window.addEventListener('resize', resize);
resize();
