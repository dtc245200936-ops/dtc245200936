FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf \
    && mkdir -p /var/log/nginx \
    && chown -R nginx:nginx /var/log/nginx
COPY --chown=nginx:nginx default.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf
USER nginx
EXPOSE 8080
