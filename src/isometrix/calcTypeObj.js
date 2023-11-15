export class CalcTypeObj {
  calcTypes({ meshObjs, meshJoints }) {
    if (meshJoints.length === 0) return;

    for (let i = 0; i < meshObjs.length; i++) {
      this.getTypeObj({ obj: meshObjs[i], joints: meshJoints });
    }
  }

  getTypeObj({ obj, joints }) {
    const arrJ = [];

    for (let i = 0; i < joints.length; i++) {
      const objsId = joints[i]['userData'].ifc_joint_id;

      const result = objsId.findIndex((id) => obj.uuid === id);

      if (result > -1) {
        // joints[i].material = joints[i].material.clone();
        // joints[i].material.color.set(0x0000ff);

        arrJ.push(joints[i]);
      }
    }

    let type = '';
    let color = 0x1e22a6;

    // труба
    if (arrJ.length === 2) {
      const dirA = arrJ[0]['userData'].dir;
      const dirB = arrJ[1]['userData'].dir;
      const dot = Math.abs(dirA.dot(dirB));

      // прямая
      if (dot > 0.98) {
        type = 'line';
        color = 0xdadbeb;

        const r1 = arrJ[0]['userData'].scale;
        const r2 = arrJ[1]['userData'].scale;

        const r = [r1, r2].sort((a, b) => b - a);

        if (Math.abs(r[0] / r[1]) < 0.95) {
          type = 'adapter';
          color = 0xfcd305;
        }
      } else {
        // изогнутая (угол)
        type = 'curved';
        color = 0x05fc79;
      }
    }

    // тройник
    if (arrJ.length === 3) {
      type = 'tee';
      color = 0x1e22a6;
    }

    if (type !== '') {
      obj.material = obj.material.clone();
      obj.material.wireframe = false;
      obj.material.color.set(color);
    }
  }
}
