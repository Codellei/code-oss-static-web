FROM nginxinc/nginx-unprivileged:1.31.6-alpine@sha256:884e0b7f42f303641b0f4e78755aea647521dca0b89ca3be7992ad78b5c07434
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /srv/code-oss-static-web/
EXPOSE 8080
