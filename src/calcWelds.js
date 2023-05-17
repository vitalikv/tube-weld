import * as THREE from 'three';

let scene;

function setInf({ scene2 }) {
  scene = scene2;
}

// расчет стыков по дисциплине
export class CalcWelds {
  customGeom = false;
  covers = [];
  geometries = [];

  constructor({ scene }) {
    setInf({ scene2: scene });
  }

  getGeometries(meshes, customGeom = false) {
    this.customGeom = customGeom;

    for (let i = 0; i < meshes.length; i++) {
      this.calcCgsCloneTube(meshes[i]);
    }

    for (let i = 0; i < this.covers.length; i++) {
      try {
        this.getClosestPoint({ arr: this.covers, id1: i });
      } catch (e) {
        // captureMessage("Ошибка получения ближайшей точки", {
        //   level: "warning",
        // });
      }
    }

    for (let i = 0; i < this.covers.length; i++) {
      if (this.covers[i].dist === Infinity) continue;
      if (this.covers[i].id2 === -1) continue;
      if (this.covers[i].tubes[0] === this.covers[this.covers[i].id2].tubes[0]) continue;

      const ifc_joint_id = [this.covers[i].tubes[0], this.covers[this.covers[i].id2].tubes[0]];

      const geometry = this.crPol({ path: this.covers[i].path, center: this.covers[i].center, ifc_joint_id });

      this.covers[this.covers[i].id2].id2 = -1;

      if (geometry.userData.scale && geometry.userData.scale > 1) continue;
      this.geometries.push(geometry);
    }

    return this.geometries;
  }

  getClosestPoint({ arr, id1 = 0 }) {
    let minDist = Infinity;
    let id2 = 0;

    for (let i = 0; i < arr.length; i++) {
      if (id1 === i) continue;
      if (arr[id1].tubes[0] === arr[i].tubes[0]) continue;

      let dist = arr[i].center.distanceTo(arr[id1].center);
      if (dist <= minDist) {
        minDist = dist;
        id2 = i;
      }
    }

    if (arr[id1].id2 === -1 || arr[id1].minDist > minDist) {
      arr[id1].id2 = id2;
      arr[id2].id2 = id1;
    }
    arr[id1].dist = arr[id1].minDist > minDist ? minDist : Infinity;
  }

  // находим начало и конец трубы
  calcCgsCloneTube(obj) {
    //obj.visible = false;
    obj.updateMatrixWorld();
    obj.updateMatrix();

    let geometry = obj.geometry.clone();
    geometry = geometry.toNonIndexed();
    obj.material.color.set(new THREE.Color(0xff0000));
    obj.material.wireframe = true;

    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');

    const arrP = this.getDataPoints({ position, normal, obj });

    const arrP_Id = this.getDataPolygons({ arr: arrP });

    this.getFirstEndPoint({ arrP_Id, obj });
  }

  // находим все уникальные точки и нормали для каждой точки
  getDataPoints({ position, normal, obj }) {
    const arrP = [];

    for (let i = 0; i < position.array.length; i += 3) {
      let dir = new THREE.Vector3(normal.array[i + 0], normal.array[i + 1], normal.array[i + 2]);
      let origin = new THREE.Vector3(position.array[i + 0], position.array[i + 1], position.array[i + 2]);
      origin = origin.applyMatrix4(obj.matrixWorld);

      //this.helperArrow({ dir, pos: origin, length: 1, color: 0x0000ff });

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
      } else if (data.dir.length === 3) {
        // если у трубы есть крышка
        list.push({ id: ind, pos: data.pos });
      }
    }

    return list;
  }

  // получаем начало и конец трубы
  getFirstEndPoint({ arrP_Id, obj }) {
    if (arrP_Id.length === 0) return;

    let path = this.getContourPoint({ arr: arrP_Id });
    if (path.length === 0) return;

    let c1 = this.getCenter({ path });
    this.covers.push({ minDist: c1.distanceTo(path[0].pos), center: c1, path, id2: -1, tubes: [obj.userData.geoGuids[0]] });

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

    path = this.getContourPoint({ arr: arrP_Id_2 });
    if (path.length === 0) return;

    let c2 = this.getCenter({ path });
    this.covers.push({ minDist: c2.distanceTo(path[0].pos), center: c2, path, id2: -1, tubes: [obj.userData.geoGuids[0]] });
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

    this.helperBox({ pos: sumPos, size: 0.1, color: 0x00ff00 });

    return sumPos;
  }

  // получаем геометрию крышки
  crPol({ path, center, ifc_joint_id }) {
    let geometry = new THREE.BufferGeometry();

    const sumPos = center;

    // custom геометрия на основе стыка
    if (this.customGeom) {
      const v = [];

      for (let i = 0; i < path.length; i++) {
        let k = path.length - 1 === i ? -i : 1;
        v.push(path[i].pos.x - sumPos.x, path[i].pos.y - sumPos.y, path[i].pos.z - sumPos.z);
        v.push(0, 0, 0);
        v.push(path[i + k].pos.x - sumPos.x, path[i + k].pos.y - sumPos.y, path[i + k].pos.z - sumPos.z);
      }

      for (let i = 0; i < path.length; i++) {
        let k = path.length - 1 === i ? -i : 1;
        v.push(path[i + k].pos.x - sumPos.x, path[i + k].pos.y - sumPos.y, path[i + k].pos.z - sumPos.z);
        v.push(0, 0, 0);
        v.push(path[i].pos.x - sumPos.x, path[i].pos.y - sumPos.y, path[i].pos.z - sumPos.z);
      }

      geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([...v]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
    } else {
      const dirA = new THREE.Vector3(path[0].pos.x - sumPos.x, path[0].pos.y - sumPos.y, path[0].pos.z - sumPos.z).normalize();
      const n = Math.ceil((path.length - 1) / 4);
      const dirB = new THREE.Vector3(path[n].pos.x - sumPos.x, path[n].pos.y - sumPos.y, path[n].pos.z - sumPos.z).normalize();

      const dir = new THREE.Vector3().crossVectors(dirA, dirB);
      this.helperArrow({ dir, pos: sumPos, length: 0.5, color: 0x0000ff });

      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0));
      const rot = new THREE.Euler().setFromRotationMatrix(m);

      const scale = new THREE.Vector3(path[0].pos.x - sumPos.x, path[0].pos.y - sumPos.y, path[0].pos.z - sumPos.z).length();

      geometry.userData.empty = true;
      geometry.userData.rot = rot;
      geometry.userData.scale = scale;
    }

    geometry.userData.ifc_joint_id = ifc_joint_id;
    geometry.userData.pos = sumPos;

    return geometry;
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
