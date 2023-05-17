import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSG } from 'three-csg-ts';

let renderer, camera, scene, clock, gui, stats;
let environment, collider, visualizer, player, controls;
let box, plane;
let tubes = [];

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
  scene.fog = new THREE.Fog(bgColor, 20, 70);
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

  // loaderObj('1');
  // loaderObj('2');
  // loaderObj('3');

  loaderObj('test_1');
  loaderObj('test_2');
  loaderObj('test_3');

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

let offset = new THREE.Vector3();

function loaderObj(name) {
  const loader = new THREE.ObjectLoader();

  loader.load(
    'img/' + name + '.json',

    function (obj) {
      if (name === '1') offset = new THREE.Vector3(30, -47, 92);
      if (name === 'test_1') offset = getBoundObject_1({ obj });
      console.log(obj.position.clone(), offset);

      obj.position.add(offset);

      tubes.push(obj);

      scene.add(obj);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },

    function (err) {
      console.error('An error happened');
    }
  );

  // Alternatively, to parse a previously loaded JSON structure
  // const object = loader.parse( a_json_object );
  // scene.add( object );
}

function onKeyDown2(event) {
  if (event.code === 'Space') {
    //calcCgsBox({ box, tube: tubes[2] });
    calcCgsTube_1({ t2: tubes[2], t1: tubes[1] });
    //calcCgsTube_2({ t2: tubes[1], t1: tubes[0] });
  } else {
    //calcCgsTube_3({ t2: plane, t1: tubes[1] });
  }
}

function calcCgsTube_1({ t2, t1 }) {
  //t1.visible = false;
  //t2 = calcCgsCloneTube(t2);
  t1 = calcCgsCloneTube(t1);
  return;
  t2.updateMatrix();
  t1.updateMatrix();

  const subRes = CSG.intersect(t2, t1);
  //subRes.position.y += 2;
  //subRes.position.add(new THREE.Vector3(0, 3, 0));

  subRes.material.color.set(new THREE.Color(0x00ff00));
  scene.add(subRes);
  t2.visible = false;
  t1.visible = false;
}

function calcCgsTube_2({ t2, t1 }) {
  t2 = calcCgsCloneTube(t2);
  t1 = calcCgsCloneTube(t1);

  t2.updateMatrix();
  t1.updateMatrix();

  const subRes = CSG.intersect(t2, t1);
  //subRes.position.add(new THREE.Vector3(0, 3, 0));

  subRes.material.color.set(new THREE.Color(0xff0000));
  scene.add(subRes);
  t2.visible = false;
  t1.visible = false;
}

function calcCgsCloneTube(obj) {
  let ttt = obj.clone();
  console.log(111, obj);
  obj.visible = false;
  ttt.updateMatrixWorld();
  ttt.updateMatrix();

  ttt.geometry = obj.geometry.clone();
  ttt.geometry = ttt.geometry.toNonIndexed();
  //ttt.geometry.computeVertexNormals();
  ttt.material = obj.material.clone();
  ttt.material.color.set(new THREE.Color(0xff0000));
  ttt.material.wireframe = true;

  let position = ttt.geometry.getAttribute('position');
  let normal = ttt.geometry.getAttribute('normal');

  let arrP = [];

  for (let i = 0; i < position.array.length; i += 3) {
    // create and set up an arrow helper to find the direction of the first normal value
    let dir = new THREE.Vector3(normal.array[i + 0], normal.array[i + 1], normal.array[i + 2]);
    let origin = new THREE.Vector3(position.array[i + 0], position.array[i + 1], position.array[i + 2]);

    origin.add(ttt.position.clone());
    const helper = new THREE.ArrowHelper(dir, origin, 1, 0x0000ff);
    helper.position.copy(origin);
    scene.add(helper);

    let ind = -1;
    for (let i2 = 0; i2 < arrP.length; i2++) {
      for (let i3 = 0; i3 < arrP[i2].pos.length; i3++) {
        if (arrP[i2].pos[i3].distanceTo(origin) < 0.0001) {
          //if (Math.abs(arrP[i2].length - origin.length()) < 0.001) {
          ind = i2;
          break;
        }
        if (ind !== -1) break;
      }
    }

    if (ind === -1) {
      arrP.push({ length: origin.length(), point: [i], dir: [dir], pos: [origin], dir2: [] });
    } else {
      arrP[ind].point.push(i);
      //arrP[ind].dir.push(dir);
      arrP[ind].pos.push(origin);

      let ext = true;
      for (let i2 = 0; i2 < arrP[ind].dir.length; i2++) {
        arrP[ind].dir2.push(arrP[ind].dir[i2].dot(dir));
        if (1 - Math.abs(arrP[ind].dir[i2].dot(dir)) < 0.0001) {
          //if (Math.abs(arrP[ind].dir[i2].length() - dir.length()) < 0.001) {
          ext = false;

          break;
        }
      }
      if (ext) arrP[ind].dir.push(dir);
    }
  }

  let newArr = [];
  let newNorm = [];
  let newInd = [];
  let arrP_Id = [];

  for (let n = 0; n < arrP.length; n++) {
    let res = arrP[n];
    let i = res.point[0];

    let origin = new THREE.Vector3(position.array[i + 0], position.array[i + 1], position.array[i + 2]);

    let dir = new THREE.Vector3();
    for (let n2 = 0; n2 < res.dir.length; n2++) {
      dir.add(res.dir[n2]);
    }
    dir.normalize();

    origin.add(ttt.position.clone());
    const helper = new THREE.ArrowHelper(dir, origin, 1, 0x00ff00);
    helper.position.copy(origin);
    //scene.add(helper);

    for (let n2 = 0; n2 < res.point.length; n2++) {
      let i = res.point[n2];

      let dl = 0.0;
      //if (res.point.length === 2) dl = 1;
      position.array[i + 0] = position.array[i + 0] + dir.x * dl;
      position.array[i + 1] = position.array[i + 1] + dir.y * dl;
      position.array[i + 2] = position.array[i + 2] + dir.z * dl;
    }

    if (res.point.length === 3) {
      let pos = new THREE.Vector3(position.array[i + 0], position.array[i + 1], position.array[i + 2]);
      arrP_Id.push({ id: i, pos });
    } else if (res.dir.length === 3) {
      for (let n2 = 0; n2 < res.dir.length; n2++) {}

      scene.add(helper);
      //res.dir.filter(d => d. > 0.65);
      let pos = new THREE.Vector3(position.array[i + 0], position.array[i + 1], position.array[i + 2]);
      arrP_Id.push({ id: i, pos });
    }
  }

  let mesh = null;
  let v = [];

  console.log('arrP', arrP);
  console.log(777, arrP_Id);
  if (arrP_Id.length > 0) {
    let path = getContourPoint({ arr: arrP_Id });
    console.log('path', path);

    let arrP_Id_2 = [];

    for (let i = 0; i < arrP_Id.length; i++) {
      let flag = false;
      for (let i2 = 0; i2 < path.length; i2++) {
        if (arrP_Id[i].id === path[i2].hit) {
          flag = true;
          break;
        }
      }

      if (!flag) arrP_Id_2.push(arrP_Id[i]);
    }

    //console.log('arrP_Id_2', arrP_Id_2);

    path = getContourPoint({ arr: arrP_Id_2 });
    // console.log(path);

    let sumPos = new THREE.Vector3();

    for (let i = 0; i < path.length; i++) {
      sumPos.add(path[i].pos);
    }

    sumPos.x /= path.length;
    sumPos.y /= path.length;
    sumPos.z /= path.length;

    let box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x00ff00, depthTest: false, transparent: true }));
    box.position.copy(sumPos);
    box.position.add(ttt.position);
    scene.add(box);

    //console.log(sumPos, ttt.position, box.position);

    for (let i = 0; i < path.length; i++) {
      let k = path.length - 1 === i ? -i : 1;
      v.push(path[i].pos.x, path[i].pos.y, path[i].pos.z);
      v.push(sumPos.x, sumPos.y, sumPos.z);
      v.push(path[i + k].pos.x, path[i + k].pos.y, path[i + k].pos.z);
    }

    for (let i = 0; i < path.length; i++) {
      let k = path.length - 1 === i ? -i : 1;
      v.push(path[i + k].pos.x, path[i + k].pos.y, path[i + k].pos.z);
      v.push(sumPos.x, sumPos.y, sumPos.z);
      v.push(path[i].pos.x, path[i].pos.y, path[i].pos.z);
    }

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([...v]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    geometry.computeVertexNormals();

    newNorm = geometry.getAttribute('normal').array;

    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, depthTest: false, transparent: true, opacity: 1, side: 2 });
    mesh = new THREE.Mesh(geometry, material);

    mesh.position.add(ttt.position);
    scene.add(mesh);

    //console.log(555, mesh);
  }

  ttt.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...position.array, ...v]), 3));
  ttt.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([...normal.array, ...newNorm]), 3));

  // let arrIndex = [];
  // let inds = ttt.geometry.getIndex();
  // for (let n = 0; n < inds.array.length; n++) {
  //   arrIndex.push(inds.array[n]);
  // }

  console.log(333, ttt.geometry);
  // ttt.geometry.setIndex([...arrIndex, ...newInd]);

  //ttt.geometry.computeVertexNormals();
  position.needsUpdate = true;
  normal.needsUpdate = true;

  scene.add(ttt);

  return ttt;
}

function getBoundObject_1({ obj }) {
  let arr = [];

  obj.updateMatrixWorld(true);

  obj.traverse(function (child) {
    if (child instanceof THREE.Mesh) {
      arr[arr.length] = child;
    }
  });

  let v = [];

  for (let i = 0; i < arr.length; i++) {
    arr[i].geometry.computeBoundingBox();
    arr[i].geometry.computeBoundingSphere();

    let bound = arr[i].geometry.boundingBox;

    v[v.length] = new THREE.Vector3(bound.min.x, bound.min.y, bound.max.z).applyMatrix4(arr[i].matrixWorld);
    v[v.length] = new THREE.Vector3(bound.max.x, bound.min.y, bound.max.z).applyMatrix4(arr[i].matrixWorld);
    v[v.length] = new THREE.Vector3(bound.min.x, bound.min.y, bound.min.z).applyMatrix4(arr[i].matrixWorld);
    v[v.length] = new THREE.Vector3(bound.max.x, bound.min.y, bound.min.z).applyMatrix4(arr[i].matrixWorld);

    v[v.length] = new THREE.Vector3(bound.min.x, bound.max.y, bound.max.z).applyMatrix4(arr[i].matrixWorld);
    v[v.length] = new THREE.Vector3(bound.max.x, bound.max.y, bound.max.z).applyMatrix4(arr[i].matrixWorld);
    v[v.length] = new THREE.Vector3(bound.min.x, bound.max.y, bound.min.z).applyMatrix4(arr[i].matrixWorld);
    v[v.length] = new THREE.Vector3(bound.max.x, bound.max.y, bound.min.z).applyMatrix4(arr[i].matrixWorld);
  }

  let bound = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };

  for (let i = 0; i < v.length; i++) {
    if (v[i].x < bound.min.x) {
      bound.min.x = v[i].x;
    }
    if (v[i].x > bound.max.x) {
      bound.max.x = v[i].x;
    }
    if (v[i].y < bound.min.y) {
      bound.min.y = v[i].y;
    }
    if (v[i].y > bound.max.y) {
      bound.max.y = v[i].y;
    }
    if (v[i].z < bound.min.z) {
      bound.min.z = v[i].z;
    }
    if (v[i].z > bound.max.z) {
      bound.max.z = v[i].z;
    }
  }

  let offset = new THREE.Vector3(
    -((bound.max.x - bound.min.x) / 2 + bound.min.x),
    -((bound.max.y - bound.min.y) / 2 + bound.min.y),
    -((bound.max.z - bound.min.z) / 2 + bound.min.z)
  );

  console.log(offset);
  return offset;
}

function getContourPoint({ arr, id = 0, path = [] }) {
  let minDist = Infinity;
  let hit = -1;
  let id2 = 0;
  let pos = new THREE.Vector3();

  for (let i = 0; i < arr.length; i++) {
    if (id === i) continue;

    if (id > 0) {
      //if (id - 1 === i) continue;
    }

    if (path.length > 0) {
      if (path[path.length - 1].hit === arr[i].id) continue;
    }

    let dist = arr[id].pos.distanceTo(arr[i].pos);
    if (dist <= minDist) {
      minDist = dist;

      id2 = arr[i].id;
      hit = arr[id].id;
      pos = arr[id].pos;
    }
  }

  let ext = path.findIndex((item) => item.hit === id2);

  path.push({ hit, id2, minDist, pos });

  if (ext > -1) hit = -1;

  if (hit > -1) {
    id = arr.findIndex((item) => item.id === id2);
    //console.log(id);
    if (id < arr.length) path = getContourPoint({ arr, id, path });
  }

  return path;
}

function render() {
  requestAnimationFrame(render);

  controls.update();

  renderer.render(scene, camera);
}
