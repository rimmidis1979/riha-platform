FROM nginx:1.27-alpine
LABEL maintainer="RIHA Software Solutions <dev@rihasoftwaresolutions.com>"
LABEL service="riha-stock-web"
LABEL version="1.0.0"

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]

