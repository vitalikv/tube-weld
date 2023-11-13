import * as THREE from 'three';

let scene;

function setInf({ scene2 }) {
  scene = scene2;
}

// расчет стыков по дисциплине
export class CalcJoints {
  constructor({ scene }) {
    setInf({ scene2: scene });
  }

  getJoints(meshes) {
    const joints = [];
    const list = [];

    for (let i = 0; i < meshes.length; i++) {
      const result = this.calculation(meshes[i]);
      list.push(...result);
    }

    for (let i = 0; i < list.length; i++) {
      this.getClosestPoint({ list, id1: i });
    }

    for (let i = 0; i < list.length; i++) {
      if (list[i].id2 !== -1) continue;
      if (list[i].clone) continue;

      this.getClosestObj({ list, id: i, meshes });
    }

    for (let i = 0; i < list.length; i++) {
      if (list[i].id2 === -1) continue;
      if (list[i].clone) continue;

      const ifc_joint_id = [...list[i].guids];
      if (list[i].id2 !== 999999) ifc_joint_id.push(...list[list[i].id2].guids);
      //const ifc_joint_id = [];

      const result = this.crPol({ path: list[i].path, center: list[i].centerPos, ifc_joint_id });

      if (result.scale && result.scale > 1) continue;
      joints.push(result);
    }

    return joints;
  }

  // находим дубли (clone = true) и одиночные стыки (id2 = -1)
  getClosestPoint({ list, id1 = 0 }) {
    if (list[id1].clone) return;

    let minDist = Infinity;
    let id2 = -1;

    for (let i = 0; i < list.length; i++) {
      if (id1 === i) continue;

      let dist = list[i].centerPos.distanceTo(list[id1].centerPos);
      if (dist <= minDist && list[id1].minDist > dist && dist < 0.001) {
        minDist = dist;
        id2 = i;
      }
    }

    list[id1].id2 = id2;
    if (id2 > -1) list[id2].clone = true; // дубль стыка
  }

  // у одиночных стыков (которые не соединены с другими трубами)
  // находим ближайший фитинг и если он есть, то этот стык помечаем, что нужно добавить на сцену
  getClosestObj({ list, id, meshes }) {
    const posC = list[id].centerPos;
    const pos1 = list[id].path[0].pos;
    const n = Math.ceil((list[id].path.length - 1) / 4);
    const pos2 = list[id].path[n].pos;

    const dirA = new THREE.Vector3(pos1.x - posC.x, pos1.y - posC.y, pos1.z - posC.z).normalize();
    const dirB = new THREE.Vector3(pos2.x - posC.x, pos2.y - posC.y, pos2.z - posC.z).normalize();

    const arr = meshes.filter((mesh) => mesh !== list[id].obj);

    const distLimit = 0.01;
    let dir = new THREE.Vector3().crossVectors(dirA, dirB).normalize();
    dir = new THREE.Vector3().addScaledVector(dir, distLimit);
    const pos = posC.clone().sub(dir);
    this.helperArrow({ dir, pos, length: 1, color: 0x0000ff });

    const ray = new THREE.Ray(pos, dir);
    const raycaster = new THREE.Raycaster();
    raycaster.ray = ray;
    const intersections = raycaster.intersectObjects(arr);

    if (intersections.length > 0) {
      if (intersections[0].distance < distLimit + 0.01) {
        list[id].id2 = 999999;
      }
    }
  }

  // находим стыки
  calculation(obj) {
    //obj.visible = false;
    obj.updateMatrixWorld();
    obj.updateMatrix();

    let geometry = obj.geometry.clone();
    geometry = geometry.toNonIndexed();
    // todo удалить
    obj.material.color.set(new THREE.Color(0xff0000));
    obj.material.wireframe = true;

    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');

    const arrP = this.getDataPoints({ position, normal, obj });

    const arrP2 = this.getDataPolygons({ arr: arrP });

    const arr = this.getCap({ arr: arrP2, obj, list: [] });

    return arr;
  }

  // находим все уникальные точки и нормали для каждой точки
  getDataPoints({ position, normal, obj }) {
    const arrP = [];

    for (let i = 0; i < position.array.length; i += 3) {
      let dir = new THREE.Vector3(normal.array[i + 0], normal.array[i + 1], normal.array[i + 2]);
      let origin = new THREE.Vector3(position.array[i + 0], position.array[i + 1], position.array[i + 2]);
      origin = origin.applyMatrix4(obj.matrixWorld);

      if (obj.uuid === '58445ddf-f8c5-4a53-a72e-dad86e8bfc3c') this.helperArrow({ dir, pos: origin, length: 1, color: 0x0000ff });

      let ind = -1;
      for (let i2 = 0; i2 < arrP.length; i2++) {
        if (arrP[i2].pos.distanceTo(origin) < 0.0001) {
          ind = i2;
          break;
        }
      }

      if (ind === -1) {
        arrP.push({ point: [i], dir: [dir], pos: origin });
      } else {
        arrP[ind].point.push(i);

        let ext = true;
        for (let i2 = 0; i2 < arrP[ind].dir.length; i2++) {
          if (1 - Math.abs(arrP[ind].dir[i2].dot(dir)) < 0.0001) {
            ext = false;
            break;
          }
        }
        if (ext) arrP[ind].dir.push(dir);
      }
    }

    return arrP;
  }

  // получаем массив полигонов для построение крышки
  getDataPolygons({ arr }) {
    const list = [];

    for (let i = 0; i < arr.length; i++) {
      const data = arr[i];
      const ind = data.point[0];

      const dir = new THREE.Vector3();
      for (let i2 = 0; i2 < data.dir.length; i2++) {
        dir.add(data.dir[i2]);
      }
      dir.normalize();

      //this.helperArrow({ dir, pos: data.pos, length: 1, color: 0x00ff00 });

      // если у трубы нету крышки
      if (data.point.length === 3) {
        list.push({ id: ind, pos: data.pos });
      }
      if (data.dir.length === 3) {
        // если у трубы есть крышка
        list.push({ id: ind, pos: data.pos });
      }
    }

    return list;
  }

  // получаем крышку
  getCap({ arr, obj, list }) {
    if (arr.length === 0) return list;
    if (list.length > 4) return [];

    let path = this.getContourPoint({ arr });
    if (obj.uuid === '58445ddf-f8c5-4a53-a72e-dad86e8bfc3c') console.log(obj, path);
    if (path.length === 0) return list;
    if (path.length < 12) return [];

    const centerPos = this.getCenter({ path });
    const minDist = centerPos.distanceTo(path[0].pos);
    list.push({ path, centerPos, minDist, guids: [obj.userData.geoGuids[0]], obj });

    let arr2 = [];

    for (let i = 0; i < arr.length; i++) {
      let flag = false;
      for (let i2 = 0; i2 < path.length; i2++) {
        if (arr[i].id === path[i2].hit) {
          flag = true;
          break;
        }
      }

      if (!flag) arr2.push(arr[i]);
    }

    return this.getCap({ arr: arr2, obj, list });
  }

  // получаем контру круга
  getContourPoint({ arr, id = 0, path = [] }) {
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

    if (path.length > arr.length) return [];
    if (ext > -1) hit = -1;

    if (hit > -1) {
      id = arr.findIndex((item) => item.id === id2);
      if (id < arr.length) path = this.getContourPoint({ arr, id, path });
    }

    return path;
  }

  // получаем центр крышки
  getCenter({ path }) {
    let sumPos = new THREE.Vector3();

    for (let i = 0; i < path.length; i++) {
      sumPos.add(path[i].pos);
    }

    sumPos.x /= path.length;
    sumPos.y /= path.length;
    sumPos.z /= path.length;

    //this.helperBox({ pos: sumPos, size: 0.1, color: 0x00ff00 });

    return sumPos;
  }

  // получаем геометрию крышки
  crPol({ path, center, ifc_joint_id }) {
    const dirA = new THREE.Vector3(path[0].pos.x - center.x, path[0].pos.y - center.y, path[0].pos.z - center.z).normalize();
    const n = Math.ceil((path.length - 1) / 4);
    const dirB = new THREE.Vector3(path[n].pos.x - center.x, path[n].pos.y - center.y, path[n].pos.z - center.z).normalize();

    const dir = new THREE.Vector3().crossVectors(dirA, dirB).normalize();
    this.helperArrow({ dir, pos: center, length: 1, color: 0x0000ff });

    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0));
    const rot = new THREE.Euler().setFromRotationMatrix(m);

    const scale = new THREE.Vector3(path[0].pos.x - center.x, path[0].pos.y - center.y, path[0].pos.z - center.z).length();

    return { pos: center, rot: new THREE.Vector3(rot.x, rot.y, rot.z), scale, ifc_joint_id, isUser: false, isDeleted: true };
  }

  // todo удалить
  // построение векторов для визуализиции
  helperArrow({ dir, pos, length = 1, color = 0x0000ff }) {
    const helper = new THREE.ArrowHelper(dir, pos, length, color);
    helper.position.copy(pos);
    scene.add(helper);
  }

  // todo удалить
  // построение кубов для визуализиции
  helperBox({ pos, size, color = 0x0000ff }) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ color, depthTest: true, transparent: true }));
    box.position.copy(pos);
    scene.add(box);
  }
}
