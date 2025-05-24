# FROM owasp/modsecurity-crs:3.3-nginx-202308070908
FROM nginx:alpine

USER root

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

COPY ./nginx/conf.d/ /etc/nginx/conf.d/

RUN rm -rf /docker-entrypoint.d/* /etc/nginx/templates/ /opt/owasp-crs

EXPOSE 80 443

ENTRYPOINT []

CMD ["nginx", "-g", "daemon off;"]
