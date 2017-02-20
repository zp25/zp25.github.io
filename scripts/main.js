/**
 * service worker状态变更处理
 * @param {Event} e 事件对象
 */
function swStateChange(e) {
  const t = document.querySelector('.sw .sw__state');
  const state = e.target.state;

  t.classList.remove('sw__state--ready', 'sw__state--error');

  if (state === 'activated') {
    t.classList.add('sw__state--ready');
    t.innerHTML = 'activated';
  }
}

if ('serviceWorker' in navigator) {
  const serviceWorker = navigator.serviceWorker;
  const t = document.querySelector('.sw .sw__state');

  serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
    const sw = reg.installing || reg.waiting || reg.active;

    // 直接进入activated状态
    if (serviceWorker.controller) {
      t.classList.add('sw__state--ready');
      t.innerHTML = 'activated';
    }

    sw && sw.addEventListener('statechange', swStateChange);
  }).catch((err) => {
    t.classList.remove('sw__state--ready');
    t.classList.add('sw__state--error')

    t.innerHTML = err.message;
  });
} else {
  document.querySelector('.sw .sw__state').innerHTML = 'No support';
}

/**
 * 导航事件处理
 * @param {Event} e 事件对象
 */
function triggerNavigator(e) {
  if (navigator.standalone) {
    e.preventDefault();

    location.href = e.target.href;
  }
}

/**
 * 事件捕获和分发
 * @param {Event} e 事件对象
 */
function eventHandler(e) {
  const trigger = e.target.dataset.trigger;

  if (trigger === 'navigator') {
    triggerNavigator(e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 捕获全局点击事件
  document.body.addEventListener('click', eventHandler, false);
});
