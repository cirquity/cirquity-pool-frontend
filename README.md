# Cirquity Pool Frontend

Simply host the contents of this repository on your server capable of serving simple static files.

Edit the variables in the `config.js` file to use your pool's specific configuration.

Variable explanations:

```javascript
/* Must point to the API setup in your config.json file. */
let api = "http://poolhost:8117";

/* Contact email address. */
let email = "cirquity@pm.me";

/* Pool Telegram URL. */
let telegram = "https://t.me/cirquity";

/* Pool Discord URL */
let discord = "https://chat.cirquity.com";

/* Facebook Discord URL */
let facebook = "https://www.facebook.com/cirquity";

/* Market stat display params from https://www.cryptonator.com/widget */
let marketCurrencies = ["{symbol}-BTC", "{symbol}-LTC", "{symbol}-DOGE", "{symbol}-USDT", "{symbol}-USD", "{symbol}-EUR", "{symbol}-CAD"];

/* Used for front-end block links. */
let blockchainExplorer = "https://explorer.cirquity.com/block.html?hash={id}";

/* Used by front-end transaction links. */
let transactionExplorer = "https://explorer.cirquity.com/transaction.html?hash={id}";

/* Default language */
let defaultLang = 'en';
```


Then simply serve the files via nginx, Apache, Google Drive, or anything that can host static content.

#### SSL

You can configure the API to be accessible via SSL using various methods. Find an example for nginx below:

* Using SSL api in `config.json`:

By using this you will need to update your `api` variable in the `config.js`. For example: `var api = "https://poolhost:8119";`

* Inside your SSL Listener, add the following:

``` javascript
location ~ ^/api/(.*) {
    proxy_pass http://127.0.0.1:8117/$1$is_args$args;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

By adding this you will need to update your `api` variable in the `config.js` to include the /api. For example: `var api = "http://poolhost/api";`

You no longer need to include the port in the variable because of the proxy connection.

* Using his own subdomain, for example `api.poolhost.com`:

```bash
server {
    server_name api.poolhost.com
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    ssl_certificate /your/ssl/certificate;
    ssl_certificate_key /your/ssl/certificate_key;

    location / {
        more_set_headers 'Access-Control-Allow-Origin: *';
        proxy_pass http://127.0.01:8117;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

By adding this you will need to update your `api` variable in the `config.js`. For example: `var api = "//api.poolhost.com";`

You no longer need to include the port in the variable because of the proxy connection.
