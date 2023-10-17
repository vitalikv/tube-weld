import * as THREE from 'three';

import { meshObjs, meshJoints } from './index';

export class ClickHelper {
  controls;
  scene;
  canvas;
  intersection;
  activated = true;

  constructor({ controls, canvas }) {
    this.controls = controls;
    this.canvas = canvas;

    document.addEventListener('mousedown', this.onMouseDown, false);
  }

  setActivated(value) {
    this.activated = value;
  }

  onMouseDown = (event) => {
    if (!this.activated) return;
    if (meshJoints.length === 0) return;

    const ray = this.rayIntersect(event, meshJoints, 'arr');

    if (ray && ray.length > 0) {
      console.log(ray[0].object['userData']);
    }
  };

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
}