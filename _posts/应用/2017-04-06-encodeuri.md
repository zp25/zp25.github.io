---
layout: post
title:  encode URI
categories: 应用
---

+ [URI](#uri)
+ [Form](#form)
  + [application/x-www-form-urlencoded](#str)
  + [multipart/form-data](#binary)
+ [空格应该编码为 + 还是 %20](#space)

具体

# URI {#uri}
URI的通用格式由scheme, authority, path, query, fragment几个部分组成，每个部分都有可使用字符的规定，例如

+ scheme，以字母开头，之后可包含字母、数字、`'+', '-', '.'`
+ authority，由三部分组成
  + userinfo，用户认证信息，使用`'@'`终止
  + host，IPv4地址必须是点分十进制数，IPv6地址必须使用`'[]'`包裹，域名以`'.'`分割为多个domain label，每个domain label以字母或数字起始和终止，可包含`'-'`字符
  + port，使用`':'`起始

各组成部分(包括子组件)通过一些保留字符(Reserved Characters)分割，分为gen-delims和sub-delims

~~~
reserved = gen-delims / sub-delims

gen-delims = ":" / "/" / "?" / "#" / "[" / "]" / "@"

sub-delims = "!" / "$" / "&" / "'" / "(" / ")"
             / "*" / "+" / "," / ";" / "="
~~~
gen-delims用于分割通用组件，sub-delims分割子组件，当组件中遇到保留字符，需通过百分号编码转义；因为URI不同组成部分有不同的可使用字符，使用不同分割符，例如query中子组件可使用保留字`'/', '?'`，这时无须转码，需注意

可以在URI中使用且无需转义的字符称为非保留字符(Unreserved Characters)，非保留字符包括`ALPHA / DIGIT / "-" / "." / "_" / "~"`

# Form {#form}
HTML表单上传数据前会对数据进行编码，可通过enctype属性配置编码方式；后端语言对这些编码方式有很好的支持，可以方便的解析上传数据

## application/x-www-form-urlencoded {#str}
默认，类似query string的k-v对方式组合数据，写入HTTP请求的entity-body；编码规则

+ 转码，空格转换为`'+'`，其余保留字符、非字母数字字符使用百分号编码进行转码，[RFC1738][rfc1738] section2.2
+ k-v对以document中的顺序排列，`'='`连接key和value，`'&'`连接k-v对

示例

~~~
POST http://www.example.com HTTP/1.1
Content-Type: application/x-www-form-urlencoded;charset=utf-8

foo=bar&text=hello+world
~~~
hello和world间的空格转码为`'+'`

## multipart/form-data {#binary}
`application/x-www-form-urlencoded`传输大量二进制数据、包含非ASCII字符的文本时效率较低，可使用`multipart/form-data`编码方式传输文件、二进制数据、包含非ASCII字符文本

编码时以块分割每个表单数据，以boundary随机字符串分割块；块格式要求

+ 包含`Content-Disposition`头部，值是`form-data`
+ 包含`name`属性，值是对应表单的name(key)
+ 若编码不同，需提供正确的`Content-Transfer-Encoding`头部
+ 若上传文件，需提供正确的`Content-Type`头部
+ 若通过单个input上传多文件(multiple)，`Content-Type`需指定为`multipart/mixed`，多文件通过子块添加

示例

~~~
POST http://www.example.com HTTP/1.1
Content-Type: multipart/form-data; boundary=AaB03x

--AaB03x
Content-Disposition: form-data; name="submit-name"

Larry
--AaB03x
Content-Disposition: form-data; name="files"; filename="file1.txt"
Content-Type: text/plain

... contents of file1.txt ...
--AaB03x--
~~~
上传字符串和单个文件

~~~
POST http://www.example.com HTTP/1.1
Content-Type: multipart/form-data; boundary=AaB03x

--AaB03x
Content-Disposition: form-data; name="submit-name"

Larry
--AaB03x
Content-Disposition: form-data; name="files"
Content-Type: multipart/mixed; boundary=BbC04y

--BbC04y
Content-Disposition: file; filename="file1.txt"
Content-Type: text/plain

... contents of file1.txt ...
--BbC04y
Content-Disposition: file; filename="file2.gif"
Content-Type: image/gif
Content-Transfer-Encoding: binary

...contents of file2.gif...
--BbC04y--
--AaB03x--
~~~
单个input上传多文件，通过层叠结构编码，并提供更多文件信息

# 空格应该编码为 + 还是 %20 {#space}
URI中空格是非字母数字字符(Non-alphanumeric)，需进行转码；URI总是使用百分号编码方式，空格总应该编码为`%20`；表单编码有些不同，若使用`application/x-www-form-urlencoded`编码方式，空格总是转换为`'+'`

对于URI的非query部分，空格总是使用百分号编码，若`'+'`非组件保留字，使用时仅代表`'+'`字符而不是空格的转码，若是保留字则转码为`%2B`；最大的疑问在query部分，因为两种编码方式都可以接受，query部分的空格可编码为`'+'`或`%20`

百分号编码总是安全的，空格转换为`%20`，因为`'+'`不是query部分的保留字，可以在字符串中使用；若将空格转码为`'+'`，就需要将原字符串中的`'+'`转码为`%2B`避免混淆

php的`urlencode()`函数编码规则是将空格编码为`'+'`，其余除`'-', '_', '.'`的非字母数字字符都进行百分号编码，规则同于表单的`application/x-www-form-urlencoded`编码方式；java的`URLEncoder.encode`、python2的`urllib.urlencode`也是同样规则

php的`rawurlencode`遵循[RFC3986][rfc3986]规则，javascript的`encodeURI, encodeURIComponent`基本遵循，将空格编码为`%20`

个人理解是多用于后端开发的语言会选择`application/x-www-form-urlencoded`编码方式，因为更多处理表单数据，但也提供了百分号编码的替代方式；多用于前端的语言，如js就只提供了百分号编码方式，`application/x-www-form-urlencoded`编码交给浏览器处理

因为有不同编码方式，解码URI时必须确定编码时使用的规则；这次出的问题就在这里，前端使用百分号编码，同时因为部分参数使用base64编码，可能出现`'+'`；后端使用java，在没有协商下依照`application/x-www-form-urlencoded`编码规则解码，造成base64无法解码


# 参看
+ [RFC3986](http://www.ietf.org/rfc/rfc3986.txt "RFC3986")
+ [URL-wikipedia](https://en.wikipedia.org/wiki/URL "URL")
+ [Form content types-w3c](https://www.w3.org/TR/html4/interact/forms.html#h-17.13.4 "Form content types")
+ [四种常见的 POST 提交数据方式](https://imququ.com/post/four-ways-to-post-data-in-http.html "四种常见的 POST 提交数据方式")
+ [When to encode space to plus (+) or %20?](http://stackoverflow.com/questions/2678551/when-to-encode-space-to-plus-or-20 "When to encode space to plus (+) or %20?")
+ [URLEncoder not able to translate space character](http://stackoverflow.com/questions/4737841/urlencoder-not-able-to-translate-space-character "URLEncoder not able to translate space character")
+ [urlencode](http://php.net/manual/zh/function.urlencode.php "urlencode")
+ [rawurlencode](http://php.net/manual/zh/function.rawurlencode.php "rawurlencode")
+ [Class URLEncoder](https://docs.oracle.com/javase/7/docs/api/java/net/URLEncoder.html "Class URLEncoder")
+ [urllib.urlencode](https://docs.python.org/2/library/urllib.html#urllib.urlencode "urllib.urlencode")
+ [urllib.parse.urlencode](https://docs.python.org/3/library/urllib.parse.html#urllib.parse.urlencode "urllib.parse.urlencode")
+ [encodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent "encodeURIComponent()")

[rfc3986]:http://www.ietf.org/rfc/rfc3986.txt "RFC3986"
[rfc1738]:https://www.ietf.org/rfc/rfc1738.txt "RFC1738"
