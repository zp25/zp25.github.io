---
layout: post
title:  nginx配置HTTPS服务器
categories: 应用
---

~~~nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name example.com www.example.com;

    return 301 https://$server_name$request_uri;
}

server {
    # TLS和http2支持
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;

    # 证书和密钥
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

    # 需要与其他服务器通信时使用的DNS服务器，例如获取OCSP响应
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_prefer_server_ciphers on;
    ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH";

    # ssl_ecdh_curve auto;
    # ssl_ecdh_curve prime256v1:secp384r1;

    add_header Strict-Transport-Security "max-age=63072000; includeSubdomains";
    # 不允许此页面在frame中展示，即使同域
    add_header X-Frame-Options DENY;
    # 禁用浏览器的文件类型猜测
    add_header X-Content-Type-Options nosniff;
    # CSP
    add_header Content-Security-Policy "default-src 'self'; child-src 'none'; object-src 'none'; frame-ancestors 'none'";

    ssl_dhparam /etc/ssl/certs/dhparam.pem;
}
~~~
监听80端口，使用301响应跳转至https。证书使用fullchain.pem，因为可能需要中间CA的证书。浏览器会存储接收到的安全的中间证书，用于以后的认证。

+ `ssl_protocols TLSv1 TLSv1.1 TLSv1.2;`，nginx默认已设置，可省略
+ `ssl_ciphers HIGH:!aNULL:!MD5;`，默认的Cipher suite
+ `ssl_ecdh_curve auto;`，Specifies a curve for ECDHE ciphers
  + `auto`，默认，OpenSSL 1.0.2使用其内建值，低版本使用prime256v1

nginx安全配置参考了<https://cipherli.st/>。SSL测试可使用<https://www.ssllabs.com/ssltest/>，h2测试使用Chrome Dev Tools即可。

# Diffie-Hellman参数
[迪菲－赫尔曼密钥交换协议][d-h]可以让双方在完全没有对方任何预先信息的条件下通过不安全信道创建起一个密钥，在使用明文传输的TLS握手阶段提供安全通信。

~~~bash
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
~~~

配置nginx，进入配置目录snippets，创建TLS配置的可重用块

# 性能优化
TLS握手是CPU运算的集中阶段，减少握手能提高性能，有两种方式：长连接、Session Resumption。其中TLS会话恢复有两种策略

Session Identifier，SSL2.0引入，server将握手协商的信息缓存并分配一个32bytes的Session ID，通过SeverHello发送给客户端。再次握手时客户端在ClientHello信息中添加Session ID，告诉服务器还记得之前协商的Cipher suite和密钥，若服务器能通过Session ID取出纪录，将无需重新计算密钥，并省去一个RTT。但因为服务器需要为每个打开的TLS链接缓存协商数据，可能消耗过多资源，也增加了管理复杂度。并且Session Identifier存储在服务器，分布式系统无法共用。

Session Ticket，在TLS握手的最后阶段，服务器使用密钥将会话数据加密后发送给客户端，服务器无需再存储这些数据，客户端存储了协商数据和加密的会话纪录。再次握手时，客户端将会话纪录包含在SessionTicket扩展中，通过ClientHello发送给服务器。若服务器能解密得到会话数据，可重用。

~~~nginx
# 长连接70s超时
keepalive_timeout 70;

ssl_session_cache shared:SSL:10m;
ssl_session_cache builtin:1000 shared:SSL:10m;

# 默认5min
ssl_session_timeout 5m;
~~~
session配置，设置会话参数的类型和大小，可选值

+ `off`，严格禁用session cache，nginx明确通知客户端session可能不被重用
+ `none`，不适应session cache，nginx通知客户端session可能被重用，但并没有真实的存储session
+ `builtin[:size]`，被单个worker使用，size指定session量，默认20480；builtin缓存可能造成内存碎片化
+ `shared:name:size`，workers共享缓存，任意定义一个name，大小bytes定义，1M缓存大约存储4000条session

多个值可同时定义，但在使用共享缓存时不使用builtin缓存会更高效

~~~
$ openssl rand 48 > ticket.key

ssl_session_tickets on; 
ssl_session_ticket_key ticket.key;
ssl_session_ticket_key previous.key;
~~~
默认nginx开启session ticket。使用的密钥需要是48bytes随机数，并且只读取第一个配置文件。nginx没有自动修改密钥的策略，一定记得经常修改密钥。

因为旧浏览器不支持session ticket，可选择同时开启session identifier和session ticket。

# Server Name Indication
要使nginx开启TLS/SNI，需nginx编译和运行时动态链接的OpenSSL支持TLS/SNI

~~~bash
$ nginx -V
...
TLS SNI support enabled
...
~~~
查看是否支持


# Manual
+ [Configuring HTTPS servers](http://nginx.org/en/docs/http/configuring_https_servers.html "Configuring HTTPS servers")
+ [Cipherli.st: Strong Ciphers for Apache, nginx and Lighttpd](https://cipherli.st/ "Cipherli.st: Strong Ciphers for Apache, nginx and Lighttpd")
+ [How To Set Up Nginx with HTTP/2 Support on Ubuntu 16.04](https://www.digitalocean.com/community/tutorials/how-to-set-up-nginx-with-http-2-support-on-ubuntu-16-04 "How To Set Up Nginx with HTTP/2 Support on Ubuntu 16.04")
+ [How To Secure Nginx with Let's Encrypt on Ubuntu 16.04](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-16-04 "How To Secure Nginx with Let's Encrypt on Ubuntu 16.04")
+ [How To Install Nginx on Ubuntu 16.04](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-16-04 "How To Install Nginx on Ubuntu 16.04")
+ [SSL Server Test](https://www.ssllabs.com/ssltest/ "SSL Server Test")

[d-h]: http://zh.wikipedia.org/wiki/Diffie-Hellman "迪菲－赫尔曼密钥交换"
