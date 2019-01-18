---
layout: post
title: tcp_nodelay, tcp_nopush
categories: miscellaneous
---

+ [sendfile](#sendfile)
+ [Nagle's algorithm](#nagle)
+ [延时确认](#delay)
+ [tcp_nodelay, tcp_nopush](#config)

# sendfile {#sendfile}

> sendfile - transfer data between file descriptors

使用`read, write`读写数据需要在两个系统调用间切换回用户空间，切换过程中数据需要从内核空间转移到用户空间。使用`sendfile`数据直接在内核空间中完成两个文件描述符(file descriptors)间的传递。

服务器若开启sendfile可以降低系统开销，例如在内核空间中完成数据由磁盘读入缓存转移到sokcet关联的缓存，避免多余的上下文切换。

# Nagle's algorithm {#nagle}

纳格算法(Nagle's algorithm)通过减少数据包发送量来增进TCP/IP网络的性能。

纳格算法主要用于解决小包问题(small-packet problem)，例如连续发送1byte数据块的应用(Telnet)，因为TCP和IP包头部合计40bytes，整个包有效数据占比极低，并且发送大量小包可能造成网络拥塞。纳格算法可以累积多个小块数据后以一个TCP报文发送，实现方式是要求同一时刻连接中仅存在一个未确认包，在等待ACK期间持续缓冲小块数据准备下一次发送。伪代码

    if there is new data to send
      if the window size >= MSS and available data is >= MSS
        send complete MSS segment now
      else
        if there is unconfirmed data still in the pipe
          enqueue data in the buffer until an acknowledge is received
        else
          send data immediately
        end if
      end if
    end if

不适宜使用纳格算法的情形，例如发送数据量大于MSS，发送最后一段数据(小于MSS)前需等待接收之前所有包的ACK。或者遇上写-写-读情形，向发送缓存写入两个小块数据(小于MSS)后等待，因为连接中没有未确认包，第一个小块数据会立即发送，但第二小块数据需要等待ACK后发送。

纳格算法和延时确认一起使用会造成额外延时。

# 延时确认 {#delay}

延时确认(TCP delayed acknowledgment)是另一种减少数据包发送量的技术，接收端可以选择延迟发送ACK，等待将多个ACK合并或与响应数据一起发送。延时最长不超过500ms。

例如配置延时40ms，接收端接收到第一个TCP包后等待最长40ms，若期间接收到另一个TCP包，两个ACK将通过一个包发送。若等待超时，接收端会发送单个ACK，若有响应数据需要发送，等待时间也利于响应数据累积，ACK和响应数据将一并发送。

同时应用纳格算法和延时确认会造成额外的延时。因为纳格算法同一时刻仅允许一个未确认包，延时确认却将ACK延时发送，在发送端缓存数据不足MSS时，总需要等待延时确认超时。

# tcp_nodelay, tcp_nopush {#config}

> In general, since Nagle's algorithm is only a defense against careless applications, it will not benefit a carefully written application that takes proper care of buffering; the algorithm has either no effect, or negative effect on the application.

Linux默认开启纳格算法解决小包问题，可通过`TCP_NODELAY`选项(per-socket)关闭。nginx通过`tcp_nodelay`管理`TCP_NODELAY`选项，默认`tcp_nodelay on;`关闭纳格算法，因为web服务器更多发送大块数据，关闭纳格算法可以减小时延。

纳格算法并不关心发送包的大小，第一个包或接收到ACK时，无论缓存数据是否到达MSS都立即发送。Linux另一个socket选项`TCP_CORK`可用于提高每个TCP包的利用率。若设置`TCP_CORK`选项，socket类似于堵上了软木塞子(cork)，只有累积了足够数据才允许发送，例如达到MSS。或者需要发送小块数据时移除塞子，即清理`TCP_CORK`选项。

nginx通过`tcp_nopush`管理`TCP_CORK`选项，默认`tcp_nopush: off;`，需要在`sendfile on;`时开启才有效。开启后，nginx会等待缓存中数据累积到MSS才发送，若到达最后一段数据，nginx会移除`TCP_CORK`选项使小块数据立即发送。

~~~nginx
sendfile     on;
tcp_nodelay  on;
tcp_nopush   on;
~~~

我最初看到这样的配置时非常疑惑，一个设置立即发送，另一个设置不立即发送，而且还同时开启了。事实是两个配置并不冲突，立即发送是在连接中有未确认包时依然可以发送新包，而不立即发送是需要充分利用一个TCP包的荷载。即先要填满一个包，然后不需要等待之前包的ACK就可以立即发送。

# 参看

+ [SENDFILE(2)](http://man7.org/linux/man-pages/man2/sendfile.2.html "SENDFILE(2)")
+ [Nagle's algorithm](https://en.wikipedia.org/wiki/Nagle%27s_algorithm "Nagle's algorithm")
+ [纳格算法](https://zh.wikipedia.org/wiki/%E7%B4%8D%E6%A0%BC%E7%AE%97%E6%B3%95 "纳格算法")
+ [TCP delayed acknowledgment](https://en.wikipedia.org/wiki/TCP_delayed_acknowledgment "TCP delayed acknowledgment")
+ [How do I control TCP delayed ACK and delayed sending?](https://access.redhat.com/solutions/407743 "How do I control TCP delayed ACK and delayed sending?")
+ [TCP_NODELAY and Small Buffer Writes](https://access.redhat.com/documentation/en-US/Red_Hat_Enterprise_MRG/1.2/html/Realtime_Tuning_Guide/sect-Realtime_Tuning_Guide-Application_Tuning_and_Deployment-TCP_NODELAY_and_Small_Buffer_Writes.html "TCP_NODELAY and Small Buffer Writes")
+ [Nginx Optimization: understanding sendfile, tcp_nodelay and tcp_nopush](https://thoughts.t37.net/nginx-optimization-understanding-sendfile-tcp-nodelay-and-tcp-nopush-c55cdd276765 "Nginx Optimization: understanding sendfile, tcp_nodelay and tcp_nopush")
+ [tcp(7)](https://linux.die.net/man/7/tcp "tcp(7)")
