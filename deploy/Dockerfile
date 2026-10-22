FROM public.ecr.aws/nginx/nginx-unprivileged:1.31.8-alpine@sha256:a2545a4b4fdebc62bd6a624ba64bea3a1b8bb6e71deabe973ceec621349d5301
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /srv/code-oss-static-web/
EXPOSE 8080
