---
title: Local Dev Should Use HTTPS Too
date: 2024-07-23
---

There’s no longer any excuse not to use HTTPS when doing local development. The effort to spin up a
reverse-proxy is very low, and the cost is zero. As evolving HTTP security standards have
continually pushed HTTP and HTTPS apart, it’s become messy, unsafe, and impractical to develop a
website on localhost without security certificates.

Firstly, it’s messy because your code will grow an annoying amount of _if statements_ related to
special handling of your unsafe HTTP development environment and secured HTTPS production
environment. Secondly, it’s unsafe because various browser security policies around cookies,
cross-site scripting, and secure context will only kick into effect in production, leading to bugs
that you would have caught earlier if there wasn’t drift between environments. Lastly, it’s
impractical because many modern web features, such as service workers, geolocation, and certain
authentication mechanisms, require a secure context that HTTP cannot provide.

On top of these issues, developing with HTTPS offers additional benefits, such as enhanced security
when using public WiFi and being able to share a link with a colleage to feature previews or visual
tests. Without HTTPS, any data transmitted between your development server and your browser is
vulnerable to interception by malicious actors on the same network.

Some advocate for [an end to _localhost_](https://dx.tips/the-end-of-localhost), promoting
cloud-based development environments. Many enterprise teams have adopted this approach to support
their engineers with minimized setup, environment spin-up, and workflow burden. However, for smaller
teams, I suggest allowing engineers to buy or use a personal domain, and tying a subdomain for each
project to a local tunnel.

Utilizing tools like Cloudflare Tunnels can simplify this process by securely exposing your
development server to the internet. This allows you to test your applications in a real-world,
HTTPS-enabled environment without the hassle of managing your own certificates and network
configurations. Assuming the top-level domain DNS is managed by Cloudflare, here’s how you’d quickly
set up a tunnel:

```bash
cloudflared tunnel login
cloudflared tunnel create my-project
```

This should have generated a file like this on `.cloudflared/<uuid>.json`

```
{
  "AccountTag": "<ACCOUNT_ID>",
  "TunnelSecret": "<SECRET>",
  "TunnelID": "<UUID>"
}
```

Now point `my-project.my-domain.tld` to the tunnel ID:

```bash
cloudflared tunnel route dns my-project my-project.my-domain.tld
```

Assuming you have a process on `http://localhost:3090`

```bash
cloudflared tunnel run --url http://localhost:3090 my-project
```

For environments with complex routing to separate backend services you run locally you can express
more elaborate configuration with [ingress rules](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/local-management/configuration-file/) instead of just `--url`.
