import * as THREE from 'three';

import { CalcJointsForType } from './calcJointsForType';
import { CalcTypeObj } from './calcTypeObj';

import { getScene } from '../index';
import { getMeshes } from '../index';

export class GetTypeObjs {
  showType() {
    const scene = getScene();

    const geometry = new THREE.CircleGeometry(1, 32);
    const material = new THREE.MeshBasicMaterial({ color: '#000000', depthTest: false, transparent: true, opacity: 1, side: 2 });
    //color: '#7FFF00'

    const joints = this.calcJoints();

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

    const meshes = getMeshes();
    const calcTypeObj = new CalcTypeObj();
    calcTypeObj.calcTypes({ meshObjs: meshes, joints });
  }

  calcJoints() {
    const meshes = getMeshes();

    for (let i = 0; i < meshes.length; i++) {
      meshes[i].userData.geoGuids = [meshes[i].uuid];
    }

    const calcJointsForType = new CalcJointsForType();
    const joints = calcJointsForType.getJoints(meshes);

    return joints;
  }
}
