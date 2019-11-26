/*
 * 
 * VERSION 0.1.0
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

  if (!window.addEventListener) return;

  // 生成一个全局跟踪对象，同时初始化本地数据
  var pup = factory();
  if (pup == null) return;

  window.pup = pup;

  // 绑定 unload 事件
  window.addEventListener('unload', function() { 
    // 停止自动保存（同时保存一次数据）
    pup.sleep();
    window.pup = null;
  });

  // 绑定 DOMContentLoaded 事件
  window.addEventListener('DOMContentLoaded', function() {
    pup.wakeup();

    // 根据指定的选择器选取所有表单元素
    var forms = document.querySelectorAll(pup.selector);
    if (forms.length) {
      forms.forEach(function(form) {
        // 向每个表单添加 input
        var input = form.querySelector( 'input[name="track_report"]' );
        if ( !input ) {
          input = document.createElement('input');
          input.setAttribute('name', 'track_report');
          input.setAttribute('type', 'text');
          input.setAttribute('style', 'display:none');
          form.appendChild(input);
        }
        // 为每个表单的 submit 事件绑定提交报告动作
        form.onsubmit = function() {
          input.value = pup.report();
        };
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
    version = '0.1.0',

    now = Date.now(),

    // 前一个网址
    refer = {
      url: completeURL(document.referrer),
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

  // // 判断是否内部链接
  // function isInternalURL(url) {
  //   if (!url) return true;
  //   var a = document.createElement('a');
  //   a.href = url;
  //   return a.hostname.toLowerCase() === lc.hostname.toLowerCase();
  // }

  function completeURL(url) {
    if (url.slice(-1) === '/') {
      url += 'index.html';
    }
    return url.toLowerCase();
  }

  function getNotebook() {
    notebook = ls['PUP'];

    // 判断是否使用默认数据
    try {
      // 没有本地数据
      if (!notebook) throw '';

      // 无法转化本地数据, 或版本不匹配
      notebook = JSON.parse(notebook);
      if (notebook.version !== version) throw '';

      var len = notebook.memory.length,
        last = notebook.memory[len-1];

      // 记录中的最后一个网址等于当前网址
      if (last.url === current.url) {
        // 访问间隔小于 5 秒
        if (now - last.leave < 5000) {
          current = last;
          current.leave = now;
        } else {
          throw '';
        }
      } else {
        // 记录中的最后一个网址等于当前上一个网址，且访问间隔小于 5 秒
        if (last.url === refer.url && now - last.leave < 5000) {
          notebook.memory.push(current);
        } else {
          throw '';
        }
      }

    } catch (e) {
      // 使用默认数据
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
    ls['PUP'] = JSON.stringify(pup);
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
    report: function() {
      takenote();
      var report = {
        refer: pup.memory[0].url,
        trace: [],
      };
      var record = null;
      for (var i = pup.memory.length - 1; i > 0; i--) {
        record = pup.memory[i];
        report.trace.push([record.url, Math.round((record.leave - record.enter)/1000)]);
      }
      return JSON.stringify(report);
    },
  };
});