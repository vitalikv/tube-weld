import { addJoint, calcWelds, showWelds, clickHelper } from './index';

export class PanelUI {
  container$;
  elemBtnView;
  input;
  btns$ = [];

  init() {
    this.crPanel();

    this.btns$[0] = this.crBtn({ txt: 'добавить стык' });
    this.btns$[1] = this.crBtn({ txt: 'рассчитать стыки' });

    this.initEvent();
  }

  initEvent() {
    this.container$.onmousedown = (e) => {
      //e.preventDefault();
      e.stopPropagation();
    };

    let ind = 0;

    this.btns$[ind].onmousedown = (e) => {
      addJoint.setActivated(!addJoint.activated);
      clickHelper.setActivated(!clickHelper.activated);

      const btn = e.target;
      const color = btn.style.background === 'rgb(255, 255, 255)' ? '#87ea89' : '#fff';
      btn.style.background = color;
    };
    ind++;

    this.btns$[ind].onmousedown = () => {
      showWelds();
    };
    ind++;
  }

  crPanel() {
    const css = `position: absolute; top: 0; right: 0; width: 248px; height: 200px; background: #F0F0F0; border: 1px solid #D1D1D1; border-radius: 4px; font-family: arial,sans-serif; z-index: 4;`;

    const html = `
    <div style="${css}">
      <div nameId="btns" style="margin: 15px;"></div>
    </div>`;

    let div = document.createElement('div');
    div.innerHTML = html;
    this.container$ = div.children[0];
    document.body.append(this.container$);
  }

  crBtn({ txt }) {
    const css = `width: 100%; height: 30px; margin-top: 15px; font-size: 16px; text-align: center; color: #666; background: #fff; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; user-select: none;`;

    const html = `
    <div style="${css}">
      ${txt}
    </div>`;

    let div = document.createElement('div');
    div.innerHTML = html;
    div = div.children[0];

    this.container$.querySelector('[nameId="btns"]').append(div);

    return div;
  }
}
