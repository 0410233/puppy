/**
 *
 * VERSION 0.3.0
 *
 * 简单的站内跟踪代码
 * 利用本地存储记录用户浏览轨迹，在用户提交表单时将报告一并提交
 *
 * 使用方法：
 *
 * 1. 引入：
 *   <script src="/js/pup.min.js"></script>
 *
 * 2. 设置（非必要）：
 *   <script>
 *     window.pup.home('form#contactform');
 *   </script>
 */
;(function(window, factory) {

  if (!document.addEventListener) return;

  // NodeList.prototype.forEach Polyfill
  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (callback, thisArg) {
      thisArg = thisArg || window;
      for (var i = 0; i < this.length; i++) {
        callback.call(thisArg, this[i], i, this);
      }
    };
  }

  // 生成一个全局跟踪对象，同时初始化本地数据
  var pup = factory();
  if (pup == null) return;

  window.pup = pup;

  // 绑定 unload 事件
  window.onunload = function() {
    // 停止自动保存（同时保存一次数据）
    pup.sleep();
    window.pup = null;
  };

  // 绑定 DOMContentLoaded 事件
  document.addEventListener('DOMContentLoaded', function() {
    pup.wakeup();

    // 根据指定的选择器选取所有表单元素
    var forms = document.querySelectorAll(pup.selector);
    if (forms.length) {
      forms.forEach(function(form) {
        // 初始化表单
        pup.init(form)
      });
    }
  });

})(window, function(){

  // 如果本地存储不可用，则终止
  var ls = window.localStorage;
  if ( typeof ls !== 'object' ) return null;

  var lc = window.location;

  var
    // 版本，升级时需要
    version = '0.3.0',

    now = Date.now(),

    // 来源网址
    refer = {
      url: document.referrer,
      enter: now,
      leave: now,
    },

    // 当前网址
    current = {
      url: completeURL(lc.href),
      enter: now,
      leave: now,
    },

    notebook = null;

  function completeURL(url) {
    if (url.slice(-1) === '/') {
      url += 'index.html';
    }
    return url.toLowerCase();
  }

  function getNotebook() {
    notebook = ls['PUPsNoteBook'];

    // 判断如何更新记录
    try {
      // 没有本地数据
      if (!notebook) throw 'notebook is not available';

      // 无法转化本地数据, 或版本不匹配
      notebook = JSON.parse(notebook);
      if (!notebook || notebook.version !== version) throw 'notebook is not available or version does not match';

      var len = notebook.memory.length,
        last = notebook.memory[len-1];

      // 访问间隔大于 5 秒（稍长于 3 秒的自动保存间隔）
      if (now - last.leave > 5000) {
        throw '>=5s';
      }

      // 正常跳转，来源网址等于记录中的最后一个网址
      if (last.url === refer.url) {
        notebook.memory.push(current);
      }

      // 刷新，当前网址等于记录中的最后一个网址
      else if (last.url === current.url) {
        current = last;
        current.leave = now;
      }

      // 其它
      else {
        throw 'other';
      }

    } catch (e) {
      // 新建记录
      notebook = {
        version: version,
        memory: [
          refer,
          current,
        ],
      };
    }
  }

  function takenote() {
    current.leave = Date.now();
    ls['PUPsNoteBook'] = JSON.stringify(notebook);
  }

  var _ticktack = null;

  // 每 3 秒自动保存
  function hardworking() {
    clearTimeout(_ticktack);
    takenote();
    _ticktack = setTimeout(hardworking, 3000);
  }

  return {
    selector: 'form.report_trace',

    home: function(selector) {
      this.selector = selector;
    },

    init: function(form) {
      var pup = this;

      // 向每个表单添加 input
      var input = form.querySelector('input[name="track_report"]');
      if (!input) {
        input = document.createElement('input');
        input.setAttribute('name', 'track_report');
        input.setAttribute('type', 'text');
        input.setAttribute('style', 'display:none');
        form.appendChild(input);
      }
      // 为每个表单的 submit 事件绑定提交报告动作
      form.addEventListener('submit', function() {
        input.value = pup.notes();
      });
    },

    // 获取或生成本地数据
    wakeup: function() {
      getNotebook();
      hardworking();
    },

    sleep: function() {
      clearTimeout(_ticktack);
      takenote();
    },

    /**
     * 生成浏览轨迹报告
     * 1.每条浏览记录包括 网址 和 停留时间 两部分
     * 2.显示顺序即浏览顺序倒序
     */
    notes: function() {
      takenote();
      var notes = {
        refer: notebook.memory[0].url,
        trace: [],
      };
      var record = null;
      for (var i = notebook.memory.length - 1; i > 0; i--) {
        record = notebook.memory[i];
        notes.trace.push([record.url, Math.round((record.leave - record.enter)/1000)]);
      }
      return JSON.stringify(notes);
    },
  };
});
