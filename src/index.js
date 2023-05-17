import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSG } from 'three-csg-ts';

import { LoaderModel } from './loader-model';
import { AddJoins } from './add-joins-3';
import { CalcWelds } from './calcWelds';
import { SelectObj } from './select-obj';

let renderer, camera, scene, clock, gui, stats;
let controls;
let addJoins, selectObj;
let meshes = [];

init();
render();

function init() {
  const bgColor = 0x263238 / 2;

  // renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(bgColor, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  // scene setup
  scene = new THREE.Scene();
  //scene.fog = new THREE.Fog(bgColor, 20, 70);
  scene.background = new THREE.Color(0xffffff);
  // lights
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1.5, 1).multiplyScalar(50);
  light.shadow.mapSize.setScalar(2048);
  light.shadow.bias = -1e-4;
  light.shadow.normalBias = 0.05;
  light.castShadow = true;

  const shadowCam = light.shadow.camera;
  shadowCam.bottom = shadowCam.left = -30;
  shadowCam.top = 30;
  shadowCam.right = 45;

  const size = 30;
  const divisions = 30;

  const gridHelper = new THREE.GridHelper(size, divisions);
  scene.add(gridHelper);

  scene.add(light);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.4));

  // camera setup
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(10, 10, -10);
  camera.far = 1000;
  camera.updateProjectionMatrix();
  window.camera = camera;

  controls = new OrbitControls(camera, renderer.domElement);

  const loaderModel = new LoaderModel({ scene });

  let indd = 5;
  if (indd === 1) {
    loaderModel.loaderObj('1');
    loaderModel.loaderObj('2');
    loaderModel.loaderObj('3');
  }
  if (indd === 2) {
    loaderModel.loaderObj('test_1');
    loaderModel.loaderObj('test_2');
    loaderModel.loaderObj('test_3');
  }
  if (indd === 3) {
    loaderModel.loaderObj('test_1_0');
    loaderModel.loaderObj('test_1_1');
    loaderModel.loaderObj('test_1_2');
    loaderModel.loaderObj('test_1_3');
    loaderModel.loaderObj('test_1_4');
    loaderModel.loaderObj('test_1_5');
  }
  if (indd === 4) {
    loaderModel.loaderObj('000-MR1_PIPE01');
  }
  if (indd === 5) {
    loaderModel.loaderObj('0019.005-TH_02.osf');
  }

  addJoins = new AddJoins({ controls, scene, canvas: renderer.domElement, tubes: meshes });
  selectObj = new SelectObj({ controls, scene, canvas: renderer.domElement, meshes: [] });

  // todo отключил метод просчета нормалей
  document.addEventListener('keydown', onKeyDown2);

  window.addEventListener(
    'resize',
    function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false
  );
}

// подписка событие - обновление массива объектов для расчета стыков
export function setMeshes({ arr }) {
  meshes = arr;
  addJoins.updateMesh(meshes);
  selectObj.updateMesh(meshes);
}

function onKeyDown2(event) {
  if (event.code === 'Space') {
    showWelds();
  }
}

// показываем стыки
function showWelds() {
  for (let i = 0; i < meshes.length; i++) {
    meshes[i].userData.geoGuids = [meshes[i].uuid];
  }

  const calcWelds = new CalcWelds({ scene });
  const geometries = calcWelds.getGeometries(meshes, false);

  const geometry = new THREE.CircleGeometry(1, 32);
  const material = new THREE.MeshBasicMaterial({ color: '#7FFF00', depthTest: false, transparent: true, opacity: 1, side: 2 });

  console.log(geometries);

  for (let i = 0; i < geometries.length; i++) {
    const g = geometries[i].userData.empty ? geometry : geometries[i];

    const mesh = new THREE.Mesh(g, material);

    if (geometries[i].userData.empty) {
      const pos = geometries[i].userData.pos;
      const rot = geometries[i].userData.rot;
      const scale = geometries[i].userData.scale;

      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.rotation.set(rot.x, rot.y, rot.z);
      mesh.scale.set(scale, scale, scale);
    } else {
      const pos = geometries[i].userData.pos;
      mesh.position.set(pos.x, pos.y, pos.z);
    }

    scene.add(mesh);
  }
}

function render() {
  requestAnimationFrame(render);

  controls.update();

  renderer.render(scene, camera);
}
