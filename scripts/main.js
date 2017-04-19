/**
 * service worker管理
 * @return {Object}
 */
const swControl = () => {
  const target = document.querySelector('.sw');

  /**
   * 反馈状态的样式修改
   * @param {string} state 当前状态
   */
  const style = (state) => {
    target.classList.remove('sw--waiting', 'sw--error', 'sw--done', 'sw--no-support');

    if (state === 'waiting') {
      target.classList.add('sw--waiting');
    } else if (state === 'error') {
      target.classList.add('sw--error');
    } else if (state === 'done') {
      target.classList.add('sw--done');
    } else if (state === 'no-support') {
      target.classList.add('sw--no-support');
    }
  };

  /**
   * 状态变更处理
   * @param {Event} e - 事件对象
   */
  const stateChange = (e) => {
    const state = e.target.state;

    if (state === 'activated') {
      style('done');
    } else {
      style('waiting');
    }
  };

  return {
    style,
    stateChange,
  };
};

const sw = () => {
  const control = swControl();

  if (typeof navigator.serviceWorker === 'undefined') {
    control.style('no-support');
    return;
  }

  const serviceWorker = navigator.serviceWorker;

  serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
    if (reg.installing || reg.waiting) {
      control.style('waiting');
    } else if (reg.active) {
      // activating, activated状态
      control.style('done');
    }

    if (serviceWorker) {
      serviceWorker.addEventListener('statechange', control.stateChange);
    }
  }).catch((err) => {
    control.style('error');
    console.log(err.message); // eslint-disable-line no-console
  });
}

/**
 * 事件分发
 */
const dispatch = handlers => (e) => {
  const trigger = e.target.dataset.trigger;

  if (trigger && {}.hasOwnProperty.call(handlers, trigger)) {
    handlers[trigger](e);
  }
};

const createHandlers = () => {
  /**
   * 导航事件处理
   * @param {Event} e - 事件对象
   */
  const navigator = (e) => {
    if (navigator.standalone) {
      e.preventDefault();

      location.href = e.target.href;
    }
  };

  /**
   * 阻止默认动作
   * @param {Event} e - 事件对象
   */
  const prevent = (e) => {
    e.preventDefault();
  };

  return {
    navigator,
    prevent,
  };
};

document.addEventListener('DOMContentLoaded', () => {
  const handlers = createHandlers();

  // 启动service worker
  sw();

  // 捕获全局点击事件
  document.body.addEventListener('click', dispatch(handlers), false);
});
