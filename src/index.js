import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSG } from 'three-csg-ts';

import { PanelUI } from './panelUI';
import { LoaderModel } from './loader-model';
import { AddJoint } from './addJoint';
import { CalcWelds } from './calcWelds';
import { CalcTypeObj } from './calcTypeObj';
import { CreateJoint } from './joints/createJoint';
import { CalcJoints } from './joints/calcJoints';
import { GetTypeObjs } from './isometrix/getTypeObjs';
import { SelectObj } from './select-obj';
import { ClickHelper } from './clickHelper';

export let scene, controls;
let renderer, camera;
let selectObj;

export let addJoint, clickHelper, calcTypeObj, createJoint, getTypeObjs;
export let meshObjs = [],
  meshJoints = [];

init();
initServ();
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
  const cameraP = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
  cameraP.position.set(10, 10, -10);
  cameraP.far = 1000;
  cameraP.updateProjectionMatrix();

  let aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
  const d = 5;
  const cameraO = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100000);
  cameraO.position.copy(cameraP.position.clone());
  cameraO.updateMatrixWorld();
  cameraO.updateProjectionMatrix();

  camera = cameraO;

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

export function getScene() {
  return scene;
}

// подписка событие - обновление массива объектов для расчета стыков
export function setMeshes({ arr }) {
  meshObjs = arr;
  addJoint.updateMesh(arr);
  createJoint.updateMesh(arr);
  //selectObj.updateMesh(arr);
}

export function getMeshes() {
  return meshObjs;
}

// показываем стыки (старый рабочей метод, с геометрией)
export function showWelds_1() {
  const meshes = meshObjs;

  for (let i = 0; i < meshes.length; i++) {
    meshes[i].userData.geoGuids = [meshes[i].uuid];
  }

  const calcWelds = new CalcWelds({ scene });
  const geometries = calcWelds.getGeometries(meshes, false);

  const geometry = new THREE.CircleGeometry(1, 32);
  const material = new THREE.MeshBasicMaterial({ color: '#7FFF00', depthTest: false, transparent: true, opacity: 1, side: 2 });

  console.log(geometries);
  const arr = [];

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

    mesh.userData = geometries[i].userData;

    scene.add(mesh);

    arr.push(mesh);
  }

  meshJoints = arr;
  console.log(arr);
}

// показываем стыки (новый метод)
export function showWelds_2() {
  const meshes = meshObjs;

  for (let i = 0; i < meshes.length; i++) {
    meshes[i].userData.geoGuids = [meshes[i].uuid];
  }

  const calcJoints = new CalcJoints({ scene });
  const result = calcJoints.getJoints(meshes);

  const geometry = new THREE.CircleGeometry(1, 32);
  const material = new THREE.MeshBasicMaterial({ color: '#7FFF00', depthTest: false, transparent: true, opacity: 1, side: 2 });

  //console.log(geometries);
  const arr = [];

  for (let i = 0; i < result.length; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    const pos = result[i].pos;
    const rot = result[i].rot;
    const scale = result[i].scale;
    const ifc_joint_id = result[i].ifc_joint_id;

    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.rotation.set(rot.x, rot.y, rot.z);
    mesh.scale.set(scale, scale, scale);

    mesh.userData = { ifc_joint_id };

    scene.add(mesh);

    arr.push(mesh);
  }

  meshJoints = arr;
  console.log(arr);
}

function initServ() {
  const panelUI = new PanelUI();
  panelUI.init();

  //calcWelds = new CalcWelds({ scene });
  addJoint = new AddJoint({ controls, scene, canvas: renderer.domElement, tubes: [] });
  createJoint = new CreateJoint({ controls, scene, canvas: renderer.domElement, tubes: [] });
  calcTypeObj = new CalcTypeObj();
  getTypeObjs = new GetTypeObjs();
  selectObj = new SelectObj({ controls, scene, canvas: renderer.domElement, meshes: [] });
  clickHelper = new ClickHelper({ controls, canvas: renderer.domElement });
}

function render() {
  requestAnimationFrame(render);

  controls.update();

  renderer.render(scene, camera);
}
