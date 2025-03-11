import * as THREE from 'three';

export class CalcTypeObj {
  calcTypes({ meshObjs, joints }) {
    if (joints.length === 0) return;

    const arr = [];

    for (let i = 0; i < meshObjs.length; i++) {
      const result = this.getTypeObj({ obj: meshObjs[i], joints });

      if (result.type === 'line') arr.push(result);
      if (result.type === 'curved') {
        arr.push(result);
        console.log(result);
      }
    }

    return arr;
  }

  getTypeObj({ obj, joints }) {
    let arrJ = [];

    for (let i = 0; i < joints.length; i++) {
      const objsId = joints[i].ifc_joint_id;

      const result = objsId.findIndex((id) => obj.uuid === id);
      if (result < 0) continue;
      arrJ.push(joints[i]);
    }

    let type = '';
    let color = 0x1e22a6;

    // труба
    if (arrJ.length === 2) {
      const dirA = arrJ[0].dir;
      const dirB = arrJ[1].dir;
      const dot = Math.abs(dirA.dot(dirB));

      // прямая
      if (dot > 0.98) {
        type = 'line';
        color = 0xdadbeb;

        const r1 = arrJ[0].scale;
        const r2 = arrJ[1].scale;

        const r = [r1, r2].sort((a, b) => b - a);

        if (Math.abs(r[0] / r[1]) < 0.95) {
          type = 'adapter';
          color = 0xfcd305;
        }
      } else {
        // изогнутая (угол)
        type = 'curved';
        color = 0x05fc79;

        const pos1 = arrJ[0].pos;
        const dir1 = arrJ[0].dir;
        const pos2 = arrJ[1].pos;
        const dir2 = arrJ[1].dir;

        const dist = pos1.distanceTo(pos2);

        const result = this.closestPointsDet(pos1, dir1, pos2, dir2);

        if (result.cross) {
          // точка пересечения должна находится от начала вектора, до бесконечности,
          // если точка находится до начала вектора, то пропускаем
          let pointOnLine = true;
          // pointOnLine = result.pos.clone().sub(pos1).normalize().dot(dir1) > 0.99 ? true : false;
          // if (pointOnLine) pointOnLine = result.pos.clone().sub(pos2).normalize().dot(dir2) > 0.99 ? true : false;

          const dist1 = result.pos.distanceTo(pos1);
          const dist2 = result.pos.distanceTo(pos2);

          if (pointOnLine && dist * 1 > dist1) {
            // this.helperArrow({ dir: dir1, pos: pos1, length: dist1, color: 0x00ff00 });
            // this.helperArrow({ dir: dir2, pos: pos2, length: dist2, color: 0x0000ff });

            const arrJ2 = [{ ...arrJ[0] }, { ...arrJ[1] }, { ...arrJ[1] }];
            //arrJ2.push({ ...arrJ[1] });
            arrJ2[1].pos = result.pos;

            arrJ = arrJ2;
          }
        }
      }
    }

    // тройник
    else if (arrJ.length === 3) {
      type = 'tee';
      color = 0x1e22a6;
    }

    if (type !== '') {
      obj.material = obj.material.clone();
      obj.material.wireframe = false;
      obj.material.color.set(color);
    }

    return { type, joints: arrJ.map((item) => item.pos) };
  }

  // находим точку пересечения двух линий в 3D
  // решение по ссылке
  // https://discourse.threejs.org/t/find-intersection-between-two-line3/7119
  // https://discourse.threejs.org/t/solved-how-to-find-intersection-between-two-rays/6464/8
  // метод находит точку пересечения, даже если линии не пересеклись
  // но есть проверка на пересечение (если dpnqnDet === 0, то линии пересекаются)
  // по ссылке есть еще один метод, но я выбрал этот
  closestPointsDet(p1, dir1, p2, dir2) {
    const qp = new THREE.Vector3().subVectors(p1, p2);

    const qpDotmp = qp.dot(dir1);
    const qpDotmq = qp.dot(dir2);
    const mpDotmp = dir1.dot(dir1);
    const mqDotmq = dir2.dot(dir2);
    const mpDotmq = dir1.dot(dir2);

    const detp = qpDotmp * mqDotmq - qpDotmq * mpDotmq;
    const detq = qpDotmp * mpDotmq - qpDotmq * mpDotmp;

    const detm = mpDotmq * mpDotmq - mqDotmq * mpDotmp;

    const pnDet = p1.clone().add(dir1.clone().multiplyScalar(detp / detm));
    const qnDet = p2.clone().add(dir2.clone().multiplyScalar(detq / detm));

    const dpnqnDet = pnDet.clone().sub(qnDet).length();

    const cross = Number(dpnqnDet.toFixed(10)) < 0.0001 ? true : false;

    return { cross, pos: qnDet };
  }
}
