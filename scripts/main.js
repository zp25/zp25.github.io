if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../sw.js', { scope: '/' });
}

/**
 * 导航事件处理
 * @param {Event} e 事件对象
 */
function triggerNavigator(e) {
  if (navigator.standalone) {
    e.preventDefault();

    window.location = e.target.href;
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

document.addEventListener('DOMContentLoaded', function () {
  document.body.addEventListener('click', eventHandler);
});

window.onload = function() {
  document.body.style.backgroundColor = '#f5f5f5';
};
