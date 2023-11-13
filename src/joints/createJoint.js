import * as THREE from 'three';

// расчет стыка по клику
export class CreateJoint {
  controls;
  scene;
  canvas;
  plane;
  mathPlane;
  intersection;
  tubes;
  activated = false;

  constructor({ controls, scene, canvas, tubes }) {
    this.controls = controls;
    this.scene = scene;
    this.canvas = canvas;
    this.tubes = tubes;

    const material = new THREE.MeshStandardMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), material);
    this.scene.add(this.plane);

    this.mathPlane = new THREE.Plane();

    document.addEventListener('mousedown', this.onMouseDown, false);
  }

  updateMesh(tubes) {
    this.tubes = tubes;
  }

  rayIntersect(event, obj, t) {
    const container = this.canvas;

    const mouse = getMousePosition(event);

    function getMousePosition(event) {
      const x = ((event.clientX - container.offsetLeft) / container.clientWidth) * 2 - 1;
      const y = -((event.clientY - container.offsetTop) / container.clientHeight) * 2 + 1;

      return new THREE.Vector2(x, y);
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.controls.object);

    let intersects = null;
    if (t === 'one') {
      intersects = raycaster.intersectObject(obj);
    } else if (t === 'arr') {
      intersects = raycaster.intersectObjects(obj, true);
    }

    return intersects;
  }

  setActivated(value) {
    this.activated = value;
  }

  onMouseDown = (event) => {
    if (!this.activated) return;

    const ray = this.rayIntersect(event, this.tubes, 'arr');

    if (ray && ray.length > 0) {
      this.intersection = ray[0];
      this.plane.position.set(0, 0, 0);
      this.plane.rotation.copy(new THREE.Euler());

      this.calcJoint();
    }
  };

  // основной метод расчета и получения стыка
  calcJoint() {
    const obj = this.intersection.object;
    const face = this.intersection.face;
    //obj.visible = false;
    obj.updateMatrixWorld();
    obj.updateMatrix();

    let geometry = obj.geometry.clone();
    //geometry = geometry.toNonIndexed();
    obj.material.color.set(new THREE.Color(0xff0000));
    obj.material.wireframe = true;

    let position = geometry.getAttribute('position');

    const index = geometry.getIndex();

    // получаем позицию точек треугольника/face по которому кликнули
    const tri = [
      new THREE.Vector3(position.getX(face.a), position.getY(face.a), position.getZ(face.a)),
      new THREE.Vector3(position.getX(face.b), position.getY(face.b), position.getZ(face.b)),
      new THREE.Vector3(position.getX(face.c), position.getY(face.c), position.getZ(face.c)),
    ];

    for (let i = 0; i < tri.length; i++) {
      const origin = tri[i];
      origin.add(obj.position.clone());
      const helper = new THREE.ArrowHelper(face.normal, origin, 1, 0x0000ff);
      helper.position.copy(origin);
      this.scene.add(helper);
    }

    const dirs = [];

    for (let i = 0; i < tri.length; i++) {
      const i2 = i === tri.length - 1 ? 0 : i + 1;
      const dir = tri[i2].clone().sub(tri[i]).normalize();
      dirs.push(dir);
    }

    const results = [];
    // есть 3 вектора, нужно понять, где правильный и создать геометрию стыка
    for (let i = 0; i < dirs.length; i++) {
      console.log('dirs[i]', dirs[i]);
      this.setPlanePosRor(dirs[i]);
      this.setMathPlanePosRor();
      const pointsOfInt = [];
      this.calcPoint(pointsOfInt);
      this.helperContourPoint(pointsOfInt);

      const contours = this.getContours(pointsOfInt, [], true);
      console.log('contours', contours);

      if (contours.length > 0 && contours[0].length > 0) {
        const path = contours[0];

        if (path.length > 6) {
          let length = 0;

          for (let i = 0; i < path.length; i++) {
            const i2 = i === path.length - 1 ? 0 : i + 1;
            length += path[i2].distanceTo(path[i]);
          }

          results.push({ path, length });
        }
      }
    }

    results.sort(function (a, b) {
      return a.length - b.length;
    });
    console.log(555, 'results', results);

    let joint = null;

    if (results.length > 0) {
      const path = results[0].path;
      const center = this.getCenter(path);
      joint = this.crPol({ path, center, ifc_joint_id: 222 });
    }

    console.log(999, joint);

    if (joint) {
      const geometry = new THREE.CircleGeometry(1, 32);
      const material = new THREE.MeshBasicMaterial({ color: '#7FFF00', depthTest: false, transparent: true, opacity: 1, side: 2 });

      const mesh = new THREE.Mesh(geometry, material);
      const pos = joint.pos;
      const rot = joint.rot;
      const scale = joint.scale;

      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.rotation.set(rot.x, rot.y, rot.z);
      mesh.scale.set(scale, scale, scale);

      this.scene.add(mesh);
    }
  }

  // утсанавливаем физическую плоскость, чтобы по ней установить математическую плоскость
  setPlanePosRor(dir) {
    const pos = this.intersection.point;
    const face = this.intersection.face;
    const plane = this.plane;

    this.plane.position.set(0, 0, 0);
    this.plane.rotation.copy(new THREE.Euler());

    if (1 === 1) {
      plane.up.copy(face.normal.clone());
      plane.lookAt(dir);
      plane.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    } else {
      plane.lookAt(face.normal.clone());
      plane.rotation.z = 0;
      plane.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2)));
    }

    plane.position.copy(pos);
  }

  // утсанавливаем мат. плоскость для расчета пересечений
  setMathPlanePosRor() {
    const plane = this.plane;
    const mathPlane = this.mathPlane;
    const index = plane.geometry.getIndex();

    const a = index.getX(0);
    const b = index.getX(1);
    const c = index.getX(2);
    const position = plane.geometry.getAttribute('position');
    const p1 = new THREE.Vector3(position.getX(a), position.getY(a), position.getZ(a));
    const p2 = new THREE.Vector3(position.getX(b), position.getY(b), position.getZ(b));
    const p3 = new THREE.Vector3(position.getX(c), position.getY(c), position.getZ(c));

    const planePointA = plane.localToWorld(new THREE.Vector3().copy(p1.clone()));
    const planePointB = plane.localToWorld(new THREE.Vector3().copy(p2.clone()));
    const planePointC = plane.localToWorld(new THREE.Vector3().copy(p3.clone()));
    mathPlane.setFromCoplanarPoints(planePointA, planePointB, planePointC);

    // const normal = new THREE.Vector3().applyQuaternion(plane.quaternion);
    // const point = new THREE.Vector3().copy(plane.position);
    // mathPlane.setFromNormalAndCoplanarPoint(normal, point).normalize();

    const helper = new THREE.PlaneHelper(mathPlane, 10, 0xffff00);
    //this.scene.add(helper);
  }

  // todo - obj удалить, нужен только для helper, чтобы поставить в нужную позицию
  getClosestPoint({ geometry, point, obj }) {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();

    const array = [];
    const faces = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      faces.push({ a, b, c });
    }

    for (let i = 0; i < faces.length; i++) {
      const a = faces[i].a;
      const b = faces[i].b;
      const c = faces[i].c;
      console.log(faces[i]);
      array.push({ id: a, pos: new THREE.Vector3(position.getX(a), position.getY(a), position.getZ(a)), face: faces[i] });
      array.push({ id: b, pos: new THREE.Vector3(position.getX(b), position.getY(b), position.getZ(b)), face: faces[i] });
      array.push({ id: c, pos: new THREE.Vector3(position.getX(c), position.getY(c), position.getZ(c)), face: faces[i] });
    }

    const minDist = 0.00001;
    const ps = [];

    for (let i = 0; i < array.length; i++) {
      if (array[i].id === point.id) continue;

      const dist = array[i].pos.distanceTo(point.pos);
      if (dist <= minDist) {
        console.log(777, i, dist, array[i], point);
        ps.push(array[i]);
      }
    }

    for (let i = 0; i < ps.length; i++) {
      const p1 = point.pos;
      const p2 = ps[i].pos;
      const dir = p1.clone().sub(p2).normalize();

      const origin = p1.clone().add(obj.position);
      const helper = new THREE.ArrowHelper(dir, origin, 1, 0xff0000);
      helper.position.copy(origin);
      this.scene.add(helper);
    }
  }

  // находим в 2-х массивах [22, 21, 36] [22, 11, 36] совпрадение только 2-х элементов
  isEqualArray({ a, b }) {
    let isEqual = false;
    let count = 0;

    if (a.length === b.length) {
      a.forEach((item1) => {
        const isEqual = b.findIndex((item2) => item1 === item2);
        if (isEqual !== -1) count++;
      });

      if (count === 2) {
        isEqual = true;
      }
    }

    return isEqual;
  }

  // расчет точек пересечения плоскости с объектом
  calcPoint(pointsInt) {
    const obj = this.intersection.object;
    const mathPlane = this.mathPlane;
    const position = obj.geometry.getAttribute('position');
    const index = obj.geometry.getIndex();
    const faces = [];

    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      faces.push({ a, b, c });
    }

    faces.forEach((face, idx) => {
      const p1 = new THREE.Vector3(position.getX(face.a), position.getY(face.a), position.getZ(face.a));
      const p2 = new THREE.Vector3(position.getX(face.b), position.getY(face.b), position.getZ(face.b));
      const p3 = new THREE.Vector3(position.getX(face.c), position.getY(face.c), position.getZ(face.c));

      const a = obj.localToWorld(p1);
      const b = obj.localToWorld(p2);
      const c = obj.localToWorld(p3);

      const lineAB = new THREE.Line3(a, b);
      const lineBC = new THREE.Line3(b, c);
      const lineCA = new THREE.Line3(c, a);

      this.setPointOfIntersection(lineAB, mathPlane, idx, pointsInt);
      this.setPointOfIntersection(lineBC, mathPlane, idx, pointsInt);
      this.setPointOfIntersection(lineCA, mathPlane, idx, pointsInt);
    });
  }

  // получаем точки пересечения плоскости с объектом
  setPointOfIntersection(line, plane, faceIdx, pointsInt) {
    const pointOfIntersection = plane.intersectLine(line, new THREE.Vector3());

    if (pointOfIntersection) {
      const p = pointOfIntersection.clone();
      p.faceIndex = faceIdx;
      p.checked = false;
      pointsInt.push(p);
    }
  }

  // todo - удалить, отображение точек пересечения плоскости с объектом
  helperContourPoint(pointsInt) {
    const pointsV = [];
    for (let i = 0; i < pointsInt.length; i++) {
      pointsV.push(pointsInt[i].x, pointsInt[i].y, pointsInt[i].z);
    }

    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.1,
      color: 0x00ff00,
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pointsV, 3));
    geometry.computeBoundingSphere();

    const points = new THREE.Points(geometry, pointsMaterial);
    this.scene.add(points);
  }

  getContours(points, contours, firstRun) {
    console.log('firstRun:', firstRun);

    let contour = [];

    let firstPointIndex = 0;
    let secondPointIndex = 0;
    let firstPoint, secondPoint;

    for (let i = 0; i < points.length; i++) {
      if (points[i].checked === true) continue;
      firstPointIndex = i;
      firstPoint = points[firstPointIndex];
      firstPoint.checked = true;

      secondPointIndex = this.getPairIndex(firstPoint, firstPointIndex, points);
      if (secondPointIndex === -1) return contours;

      secondPoint = points[secondPointIndex];
      secondPoint.checked = true;
      contour.push(firstPoint.clone());
      contour.push(secondPoint.clone());
      break;
    }

    contour = this.getContour(secondPoint, points, contour);
    contours.push(contour);
    // let allChecked = 0;
    // points.forEach((p) => {
    //   allChecked += p.checked === true ? 1 : 0;
    // });
    // console.log('allChecked: ', allChecked === points.length);
    // if (allChecked !== points.length) {
    //   return this.getContours(points, contours, false);
    // }
    return contours;
  }

  getContour(currentPoint, points, contour) {
    const p1Index = this.getNearestPointIndex(currentPoint, points);
    if (p1Index === -1) return [];

    const p1 = points[p1Index];
    p1.checked = true;

    const p2Index = this.getPairIndex(p1, p1Index, points);
    if (p2Index === -1) return [];

    const p2 = points[p2Index];
    p2.checked = true;

    const isClosed = this.pEquals(p2, contour[0], 0.001);

    //if (points.length >= contour.length) isClosed = true;

    if (!isClosed) {
      contour.push(p2.clone());
      return this.getContour(p2, points, contour);
    } else {
      contour.push(contour[0].clone());
      return contour;
    }
  }

  getNearestPointIndex(point, points) {
    let index = -1;
    for (let i = 0; i < points.length; i++) {
      let p = points[i];
      if (p.checked === false && this.pEquals(p, point, 0.001)) {
        index = i;
        break;
      }
    }
    return index;
  }

  pEquals(v1, v2, tolerance) {
    if (tolerance === undefined) {
      return v2.x === v1.x && v2.y === v1.y && v2.z === v1.z;
    } else {
      return Math.abs(v2.x - v1.x) < tolerance && Math.abs(v2.y - v1.y) < tolerance && Math.abs(v2.z - v1.z) < tolerance;
    }
  }

  getPairIndex(point, pointIndex, points) {
    let index = -1;
    for (let i = 0; i < points.length; i++) {
      let p = points[i];
      if (i !== pointIndex && p.checked === false && p.faceIndex === point.faceIndex) {
        index = i;
        break;
      }
    }
    return index;
  }

  // находим центр у контура
  getCenter(path) {
    let sumPos = new THREE.Vector3();

    for (let i = 0; i < path.length; i++) {
      sumPos.add(path[i]);
    }

    sumPos.x /= path.length;
    sumPos.y /= path.length;
    sumPos.z /= path.length;

    let box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x00ff00, depthTest: false, transparent: true }));
    box.position.copy(sumPos);
    this.scene.add(box);

    return sumPos;
  }

  crPol({ path, center, ifc_joint_id }) {
    const dirA = new THREE.Vector3(path[0].x - center.x, path[0].y - center.y, path[0].z - center.z).normalize();
    const n = Math.ceil((path.length - 1) / 4);
    const dirB = new THREE.Vector3(path[n].x - center.x, path[n].y - center.y, path[n].z - center.z).normalize();

    const dir = new THREE.Vector3().crossVectors(dirA, dirB).normalize();

    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0));
    const rot = new THREE.Euler().setFromRotationMatrix(m);

    const scale = new THREE.Vector3(path[0].x - center.x, path[0].y - center.y, path[0].z - center.z).length();

    return { pos: center, rot: new THREE.Vector3(rot.x, rot.y, rot.z), scale, ifc_joint_id, isUser: true, isDeleted: false };
  }
}
