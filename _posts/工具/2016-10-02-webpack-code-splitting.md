---
layout: post
title: Webpack代码拆分
categories: 工具
---

+ [Code Splitting](#splitting)
+ [CommonsChunkPlugin](#common)
+ [DllPlugin & DllReferencePlugin](#dll)
+ [比较](#compare)

代码拆分，其他还包括将inline资源以文件导出使用ExtractTextPlugin

# Code Splitting {#splitting}
大型项目不适合将所有依赖打包在一个文件中，特别是有些依赖仅在特定条件下才被使用；Code Splitting功能将代码拆分为几个块(chunks)，更重要的是提供按需加载

拆分时需定义拆分点(split points)，webpack将处理其中的依赖

~~~javascript
// config
{
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    // 可使用 [id], [name], [hash], [chunkhash] 替换为指定内容
    chunkFilename: '[id].chunk.js'
  }
}

// CommonJs
require.ensure(["module"], function(require) {
  var a = require("module");
  // ...
});

// AMD
require(["module"], function(a) {
  // ...
});

// es6，webpack 2支持
// webpack 2.1.0-beta.28开始使用import()替代System.import()
// https://github.com/webpack/webpack/releases/tag/v2.1.0-beta.28
import("./module").then((module) => {
  ...
}).catch(...);
~~~
拆分点在依赖导入位置，CommonJs、AMD和es6有不同的定义拆分点的方式

例中module将被拆分为一个文件，名称为1.chunk.js；chunks根据配置中target属性依照不同策略加载，如`target: 'web'`，1.chunk.js将以`webpackJsonp()`包裹，bundle.js在需要依赖模块时通过jsonp加载；`require.ensure`可传入第三个参数，必须是str，若两个拆分点有相同的第三参数会使用相同的chunk

~~~javascript
require.ensure(["./file"], function(require) {
  require("./file2");
});

// is equal to

require.ensure([], function(require) {
  require.include("./file");
  require("./file2");
});
~~~
webpack还提供`require.include`函数，将一个模块打包到当前chunk，但不运行这个模块；可以将多个child chunks都包含的模块提取到parent chunk中

chunks分为三类

+ Entry chunk，包含runtime和一些模块；若chunck包含模块0，runtime运行这个模块，否则等待包含模块0的chunk加载后运行
+ Normal chunk，不包含runtime，chunk依据不同加载策略有不同结构，例如jsonp将所有模块包裹在jsonp回调函数中；所有模块都分配数字ID
+ Initial chunk，属于normal chunk，但权重更高，因为加载时间计入应用的初始化加载时间(如Entry chunk)；可通过CommonsChunkPlugin创建

webpack可配置多个entry points，打包为多个entry chunks；entry chunks包含runtime，单个页面必须仅包含一个runtime(有例外)；CommonsChunkPlugin可用于提取多个entry points的共用模块和runtime到commons chunk(new entry chunk)，之前的entry chunk将变为initial chunk，这样一个页面仅包含一个runtime

# CommonsChunkPlugin {#common}
CommonsChunkPlugin可用于提取多个entry的共用模块，也可指定提取vendor

~~~javascript
// webpack.config.js
{
  entry: {
    a: './a',
    b: './b'
  },
  output: { filename: '[name].bundle.js' },
  plugins: [
    webpack.optimize.CommonsChunkPlugin({
      name: 'commons',
      filename: 'commons.js',
      // minChunks: 2 | Infinity,
    })
  ]
}

// a.js
var jquery = require('jquery');
var _ = require('underscore');

// b.js
var jquery = require('jquery');
~~~

~~~html
<script src="commons.js"></script>
<script src="a.bundle.js"></script>
<script src="b.bundle.js"></script>
~~~
公共依赖(jquery)和runtime被提取到commons.js；配置minChunks将至少被给定数量entry使用的公共依赖提取进commons，Infinity则创建commons但不移入任何依赖

~~~javascript
{
  entry: {
    main: './index',
    vendor: ['react', 'react-dom']
  },
  output: {
    filename: 'bundle.js'
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      filename: 'vendor.js',
    ]);
  ]
}
~~~
每个entry独立检索依赖并打包，因此main和vendor都将包含react, react-dom模块；使用CommonsChunkPlugin指定vendor为common bundle的入口，所有入口的公共模块(react, react-dom)和runtime打包进vendor.js，bundle.js包含应用代码

~~~javascript
{
  entry: {
    main: './index.js',
    vendor: ['react', 'react-dom']
  },
  output: {
    filename: '[chunkhash].[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      names: ['vendor', 'manifest'] // Specify the common bundle's name.
    })
  ]
}
~~~
提取vendor因为依赖改动少，可以有效利用浏览器缓存；因为runtime code也被打包进vendor，每次打包都可能有区别；可将runtime导出到另一个bundle(例中为manifest)，虽然多了一个bundle，但可以有效利用缓存

# DllPlugin & DllReferencePlugin {#dll}
dll bundles仅包含模块，其他包可通过模块ID导入模块并使用；可以将几乎不改变的依赖框架、工具独立打包，在之后开发中仅打包应用代码提高效率；dll文件打包和应用打包配置分开，避免配置的混乱

~~~javascript
// vendor.webpack.config.js
{
  entry: {
    alpha: ['alpha', './a'],
    beta: ['beta'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    library: '[name]_[hash]',
    libraryTarget: 'var',
  },
  plugins: [
    new webpack.DllPlugin({
      path: path.resolve(__dirname, '[name]-manifest.json'),
      name: '[name]_[hash]',
      context: __dirname
    }),
  ],
}

// alpha.bundle.js
var alpha_bddd20dd00f7b888c2b8 =
  (function (modules) {
    // webpackBootstrap
  })
  ([
    function (module, exports) {
      module.exports = "alpha";
    },
    function (module, exports) {
      module.exports = "a";
    },
    function(module, exports, __webpack_require__) {
      module.exports = __webpack_require__;
    }
  ]);
~~~
dll配置，设置`output.library`使bundle以lib导出(module.export)，`[name]_[hash]`为导出的函数的名称，其他程序导入(require)时使用；`DllPlugin`配置

+ `path`，导出manifest文件的路径，绝对路径；因为bundle使用模块的数字ID进行导入，manifest列出各模块和其ID的映射
+ `name`，导出的函数名称，和`output.library`对应
+ `context`，可选，manifest文件中使用的上下文，defaults to the webpack context

dll导出一次即可

~~~javascript
// webpack.config.js
{
  plugins: [
    new webpack.DllReferencePlugin({
      context: path.join(__dirname, '..', 'vendor'),
      manifest: require('./dist/alpha-manifest.json')
    }),
    new webpack.DllReferencePlugin({
      scope: 'beta',
      manifest: require('./dist/beta-manifest.json')
    })
  ]
}

// 使用
console.log(require('alpha'));
console.log(require('../vendor/a'));

console.log(require("beta/beta"));
~~~
使用`DllReferencePlugin`引用dll模块，配置

+ `context`，绝对路径，manifest文件中模块依赖的上下文
+ `scope`，dll函数使用时的前缀
+ `manifest`，导入manifest文件

例如在`<script>`中使用，配置Dll bundle: `output.library = "[name]_[hash]" output.libraryTarget = "var" DllPlugin.name = "[name]_[hash]"`；配置Dll consumer: `DllReferencePlugin.sourceType = "var"`

# 比较 {#compare}
拆分块方法包括

code spliting，webpack自动判断依赖并拆分出延时加载的模块，可减少首屏加载时间

CommonsChunkPlugin，多entry可提取公用模块，也可设置提取vendor；但是在开发过程中每次更新都要重新打包依赖模块，并且我还不知道怎么提取两个vendor文件

DllPlugin，需要两个配置文件，但大项目开发过程中可节省打包时间，提取多个vendor文件也很方便


# 参看
+ [CODE SPLITTING](http://webpack.github.io/docs/code-splitting.html "CODE SPLITTING")
+ [CommonsChunkPlugin](http://webpack.github.io/docs/list-of-plugins.html#commonschunkplugin "CommonsChunkPlugin")
+ [DllPlugin](http://webpack.github.io/docs/list-of-plugins.html#dllplugin "DllPlugin")
+ [DllReferencePlugin](http://webpack.github.io/docs/list-of-plugins.html#dllreferenceplugin "DllReferencePlugin")
+ [Optimizing Webpack build times and improving caching with DLL bundles](https://robertknight.github.io/posts/webpack-dll-plugins/ "Optimizing Webpack build times and improving caching with DLL bundles")
+ [What's new in webpack 2](https://gist.github.com/sokra/27b24881210b56bbaff7 "What's new in webpack 2")
+ [Code Splitting - Libraries](https://webpack.js.org/guides/code-splitting-libraries/ "Code Splitting - Libraries")
