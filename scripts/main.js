if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' });
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
