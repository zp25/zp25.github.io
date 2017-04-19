---
---

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

  const serviceWorkerContainer = navigator.serviceWorker;

  serviceWorkerContainer.register('/sw.js', { scope: '/' }).then((reg) => {
    let serviceWorker;

    if (reg.installing) {
      serviceWorker = reg.installing;
      control.style('waiting');
    } else if (reg.waiting) {
      serviceWorker = reg.waiting;
      control.style('waiting');
    } else if (reg.active) {
      // activating, activated状态
      serviceWorker = reg.active;
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

/**
 * 事件处理
 */
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

/**
 * 元素是否在y轴可视范围内
 * @param {Node} item - 需要检测是否在可视范围的元素
 * @return {boolean}
 */
const inView = item => {
  const rect = item.getBoundingClientRect();
  const itemT = rect.top;
  const itemB = itemT + rect.height;

  return itemB > 0 && itemT < window.innerHeight;
};

/**
 * 延时加载图片
 * @param {Object} item - 图片参数
 * @param {string} item.src - 图片路径
 * @param {string|string[]} item.className - 图片类名称
 * @param {function} done - 图片加载完成回调
 */
const lazyload = (data, done) => {
  const { src = 'error.jpg', className, ...dataset } = data;

  const img = new Image();

  Object.keys(dataset).forEach((key) => {
    img[key] = dataset[key];
  });

  img.src = src;
  img.classList.add.apply(img.classList, Array.isArray(className) ? className : [className]);
  img.onload = done;
};

/**
 * progressive image loader
 */
const imageLoader = (items, state) => {
  /**
   * 图片延时加载完成后添加到页面
   */
  const addImg = target => (e) => {
    target.appendChild(e.target);

    // 隐藏thumbnail，取消链接
    target.classList.add('loaded');
    target.dataset.trigger = 'prevent';
  };

  return () => {
    // 节拍器，避免频繁操作
    state.timer = state.timer || setTimeout(() => {
      state.timer = NaN;

      requestAnimationFrame(() => {
        Array.from(items).forEach((item) => {
          if (inView(item)) {
            const dataset = Object.assign({}, {
              src: item.href,
              className: ['progressive__img', 'progressive__img--full'],
            }, item.dataset);

            lazyload(dataset, addImg(item));
            // 立即移除，避免重复操作
            item.classList.remove('replace');
          }
        });
      });
    }, 300);
  };
};

document.addEventListener('DOMContentLoaded', () => {
  const handlers = createHandlers();
  const state = {
    timer: NaN,
  };

  // 启动service worker
  sw();

  // 捕获全局点击事件
  document.body.addEventListener('click', dispatch(handlers), false);

  // live HTMLCollection
  const items = document.getElementsByClassName('progressive replace');

  // progressive image loader
  const scroller = imageLoader(items, state);

  scroller();
  window.addEventListener('scroll', scroller, false);
  window.addEventListener('resize', scroller, false);
});
