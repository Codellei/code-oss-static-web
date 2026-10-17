FROM public.ecr.aws/nginx/nginx-unprivileged:1.31.7-alpine@sha256:378d0c32f6562f7fd9629170797f57d2b953aa09be983b3daaf4809bb039ca00
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /srv/code-oss-static-web/
EXPOSE 8080
