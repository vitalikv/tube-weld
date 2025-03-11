import * as THREE from 'three';

import { CalcJointsForType } from './calcJointsForType';
import { CalcTypeObj } from './calcTypeObj';
import { SvgConverter } from './svgConverter';

import { getScene } from '../index';
import { getMeshes } from '../index';

export class GetTypeObjs {
  showType() {
    const joints = this.calcJoints();

    //this.createJoints(joints);

    const meshes = getMeshes();
    const calcTypeObj = new CalcTypeObj();
    const result = calcTypeObj.calcTypes({ meshObjs: meshes, joints });

    //this.createLines(result);

    const svgConverter = new SvgConverter();
    svgConverter.createSvgScheme({ lines: result.map((item) => item.joints) });
  }

  // расчет стыков
  calcJoints() {
    const meshes = getMeshes();

    for (let i = 0; i < meshes.length; i++) {
      meshes[i].userData.geoGuids = [meshes[i].uuid];
    }

    const calcJointsForType = new CalcJointsForType();
    const joints = calcJointsForType.getJoints(meshes);

    return joints;
  }

  // создаем в сцене стыки
  createJoints(joints) {
    const scene = getScene();

    const geometry = new THREE.CircleGeometry(1, 32);
    const material = new THREE.MeshBasicMaterial({ color: '#000000', depthTest: false, transparent: true, opacity: 1, side: 2 });
    //color: '#7FFF00'

    for (let i = 0; i < joints.length; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      const pos = joints[i].pos;
      const rot = joints[i].rot;
      const scale = joints[i].scale;
      const ifc_joint_id = joints[i].ifc_joint_id;
      const dir = joints[i].dir;

      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.rotation.set(rot.x, rot.y, rot.z);
      mesh.scale.set(scale, scale, scale);
      mesh.userData = { ifc_joint_id, dir };
      scene.add(mesh);
    }
  }

  createLines(lines) {
    const scene = getScene();

    for (let i = 0; i < lines.length; i++) {
      const line = this.createLine({ points: lines[i].joints });

      scene.add(line);
    }
  }

  // отображение линий по точкам
  createLine({ points }) {
    // const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0);
    // points = curve.getPoints(12 * points.length);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true });

    const line = new THREE.Line(geometry, material);

    return line;
  }
}
