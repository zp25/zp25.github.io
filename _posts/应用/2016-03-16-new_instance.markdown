---
layout: post
title:  Ubuntu起始设置
categories: 应用
---

使用DigitalOcean，因为新建Droplet时未添加SSH key，到注册邮箱接收root密码。首先在本机生成SSH key用于以后的登录。

~~~bash
ssh-keygen
~~~
引导程序要求确定密钥存储地址和通行句(passphrase)。若提供通行句，连接需私钥和通行句，Enter跳过则仅需提供私钥。生成的私钥默认位于`~/.ssh/id_rsa`，公钥`~/.ssh/id_rsa.pub`。

需将本机生成的公钥传输到服务器，`cat ~/.ssh/id_rsa.pub`复制公钥到剪切板。然后使用root账号登录server。

~~~bash
adduser newuser
gpasswd -a newuser sudo

# 查看
cat /etc/group | grep sudo
~~~
安全考虑，先创建用于登录的用户，以免使用root登录。之后将用户添加到sudo组获取权限。

~~~bash
su - newuser

mkdir .ssh
chmod 700 .ssh
~~~
切换用户，创建用于存储用户公钥的目录，修改权限

~~~bash
vim .ssh/authorized_keys

# 将之前复制的公钥写入 #

chmod 600 .ssh/authorized_keys

# 退出新用户返回root
exit
~~~
将公钥粘帖到文件并修改权限，然后返回root

~~~bash
vim /etc/ssh/sshd_config

# 端口
prot 22

# 是否允许以root连接，默认yes
PermitRootLogin no

# 是否允许使用密码登录，去除注释，修改为no
PasswordAuthentication no

# 与证书登录相关，默认已设置
PubkeyAuthentication yes
ChallengeResponseAuthentication no
~~~
可适当修改SSH配置，如选择阻止root登录

~~~bash
# service ssh restart
systemctl reload sshd
~~~
重启SSH服务。

可尝试利用另一终端登录newuser确定服务正常`ssh newuser@SERVER_IP_ADDRESS`，一切正常可退出当前登录。

# 环境
环境搭建，包括一些常用的应用

~~~bash
sudo apt-get update && DEBIAN_FRONTEND=noninteractive \
  sudo apt-get upgrade -yq

apt-cache search linux-headers-$(uname -r)
sudo apt-get install build-essential linux-headers-$(uname -r) vim
~~~
其中linux-headers, vim默认已安装。build-essential为以后编译安装应用作准备。

## ufw
方便iptables设置而无需更多的了解iptables。ufw默认已安装，但未开启。

~~~bash
sudo apt-get install ufw

# 查看状态
sudo ufw status
~~~
安装并查看状态，ufw运行前只显示Status: inactive，运行后可查看状态和具体规则。

~~~bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 查看支持的app
$ sudo ufw app list
Available applications:
  OpenSSH

# ufw为常用端口提供简写，如ssh, www，或使用列出的app
sudo ufw allow ssh | sudo ufw allow 22/tcp
sudo ufw allow www | sudo ufw allow 80/tcp
sudo ufw deny 8000:8009/tcp

sudo ufw allow OpenSSH

# 删除之前配置的ssh规则
sudo ufw delete allow www
~~~
修改规则命令，记住一定打开ssh/OpenSSH端口，否则之后无法连接。

~~~bash
sudo ufw enable | disable

# 重新载入配置，若ufw运行时修改规则，需重载入
sudo ufw reload

# 恢复默认设置
sudo ufw reset
~~~
管理命令，此时可开启ufw

# 其他
选择应用

~~~bash
sudo dpkg-reconfigure ca-certificates
~~~
选择系统信任的证书，例如取消对CNNIC_ROOT.crt的信任


# Manual
+ [Initial Server Setup with Ubuntu 14.04](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-14-04 "Initial Server Setup with Ubuntu 14.04")
+ [Initial Server Setup with Ubuntu 16.04](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-16-04 "Initial Server Setup with Ubuntu 16.04")
+ [How To Use SSH Keys with DigitalOcean Droplets](https://www.digitalocean.com/community/tutorials/how-to-use-ssh-keys-with-digitalocean-droplets "How To Use SSH Keys with DigitalOcean Droplets")
